// script.js
// Array para armazenar as imagens selecionadas
let uploadedImages = [];
let embarcacoesList = []; // Array para armazenar a lista de embarcações

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar o formulário
    initForm();
    
    // Adicionar event listeners para calcular esforço
    document.getElementById('dataInicioPesca').addEventListener('change', calcularEsforco);
    document.getElementById('dataFimPesca').addEventListener('change', calcularEsforco);
    
    // Adicionar event listener para preview de imagens
    document.getElementById('imagens').addEventListener('change', handleImageUpload);
    
    // Adicionar event listener para o envio do formulário
    document.getElementById('desembarqueForm').addEventListener('submit', handleSubmit);
    
    // Carregar embarcações do banco de dados
    carregarEmbarcacoes();
});

// Carregar embarcações do banco de dados
async function carregarEmbarcacoes() {
    const selectEmbarcacao = document.getElementById('embarcacao');
    
    try {
        console.log('Carregando embarcações...');
        const response = await fetch('/api/embarcacoes-ativas');
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            embarcacoesList = data.data;
            console.log(`✅ ${embarcacoesList.length} embarcações carregadas`);
            preencherSelectEmbarcacoes();
        } else {
            console.error('❌ Erro ao carregar embarcações:', data.message);
            preencherEmbarcacoesFallback('Erro ao carregar embarcações');
        }
    } catch (error) {
        console.error('❌ Erro ao carregar embarcações:', error);
        preencherEmbarcacoesFallback('Erro de conexão');
    }
}

// Preencher o select de embarcações com dados do banco
function preencherSelectEmbarcacoes() {
    const selectEmbarcacao = document.getElementById('embarcacao');
    
    // Limpar todas as opções existentes
    selectEmbarcacao.innerHTML = '';
    
    // Adicionar opção padrão
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Selecione uma embarcação';
    defaultOption.disabled = true;
    defaultOption.selected = true;
    selectEmbarcacao.appendChild(defaultOption);
    
    // Adicionar embarcações do banco de dados
    embarcacoesList.forEach(embarcacao => {
        const option = document.createElement('option');
        option.value = embarcacao.id;
        option.textContent = `${embarcacao.nome_embarcacao} (${embarcacao.rgp})`;
        selectEmbarcacao.appendChild(option);
    });
    
    // Se não houver embarcações, mostrar mensagem
    if (embarcacoesList.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Nenhuma embarcação cadastrada';
        option.disabled = true;
        selectEmbarcacao.appendChild(option);
    }
}

// Fallback em caso de erro na API
function preencherEmbarcacoesFallback(mensagemErro) {
    const selectEmbarcacao = document.getElementById('embarcacao');
    
    // Limpar todas as opções
    selectEmbarcacao.innerHTML = '';
    
    // Adicionar opção de erro
    const errorOption = document.createElement('option');
    errorOption.value = '';
    errorOption.textContent = `${mensagemErro} - Use opções estáticas`;
    errorOption.disabled = true;
    errorOption.selected = true;
    selectEmbarcacao.appendChild(errorOption);
    
    // Adicionar opções estáticas como fallback
    const opcoesEstaticas = [
        { id: 'fallback-1', nome: "N/A", rgp: "000" }
    ];
    
    opcoesEstaticas.forEach(embarcacao => {
        const option = document.createElement('option');
        option.value = embarcacao.id;
        option.textContent = `${embarcacao.nome} (${embarcacao.rgp})`;
        selectEmbarcacao.appendChild(option);
    });
}

// Inicializar o formulário
function initForm() {
    // Preencher cidades do Espírito Santo
    const cidadesES = [
        "Itaparica", "Itapoã", "Praia do Ribeiro", "Praia da costa", "Prainha", 
        "Praia do Suá/Canto", "Enseada do Suá", "Ilha das Caieiras", "Santo Antônio", "Grande Vitória"
    ];
    
    const selectLocal = document.getElementById('localDesembarque');
    cidadesES.forEach(cidade => {
        const option = document.createElement('option');
        option.value = cidade;
        option.textContent = cidade;
        selectLocal.appendChild(option);
    });
    
    // Atualizar preview de imagens
    updateImagePreview();
}

// Adicionar linha à tabela de espécies
function addRow() {
    const table = document.getElementById('especiesTable').getElementsByTagName('tbody')[0];
    const newRow = table.insertRow();
    
    const cell1 = newRow.insertCell(0);
    const cell2 = newRow.insertCell(1);
    const cell3 = newRow.insertCell(2);
    
    cell1.innerHTML = '<input type="text" name="especie[]" placeholder="Nome da espécie">';
    cell2.innerHTML = '<input type="number" name="quantidade[]" min="0" step="0.1" placeholder="Kg">';
    cell3.innerHTML = '<button type="button" class="btn-remove" onclick="removeRow(this)">Remover</button>';
}

// Remover linha da tabela de espécies
function removeRow(button) {
    const row = button.parentNode.parentNode;
    const table = document.getElementById('especiesTable').getElementsByTagName('tbody')[0];
    
    // Não permitir remover se houver apenas uma linha
    if (table.rows.length > 1) {
        row.parentNode.removeChild(row);
    } else {
        alert('A tabela deve ter pelo menos uma espécie.');
    }
}

// Mostrar/ocultar campo "Outro" para destinação
function toggleOutroDestinacao() {
    const select = document.getElementById('destinacao');
    const container = document.getElementById('outroDestinacaoContainer');
    
    if (select.value === 'Outro') {
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
    }
}

// Mostrar/ocultar campo "Outro" para arte de pesca
function toggleOutroArtePesca() {
    const select = document.getElementById('artePesca');
    const container = document.getElementById('outroArtePescaContainer');
    
    if (select.value === 'Outro') {
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
    }
}

// Calcular esforço de pesca
function calcularEsforco() {
    const inicio = document.getElementById('dataInicioPesca').value;
    const fim = document.getElementById('dataFimPesca').value;
    const esforcoField = document.getElementById('esforco');
    
    if (inicio && fim) {
        const inicioDate = new Date(inicio);
        const fimDate = new Date(fim);
        
        if (fimDate > inicioDate) {
            const diffMs = fimDate - inicioDate;
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            
            esforcoField.value = `${diffHours} horas e ${diffMinutes} minutos`;
        } else {
            esforcoField.value = '';
            alert('A data de fim deve ser posterior à data de início.');
        }
    } else {
        esforcoField.value = '';
    }
}

// Processar upload de imagens
function handleImageUpload(event) {
    const files = event.target.files;
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (file.type.match('image.*')) {
            // Verificar se a imagem já foi adicionada
            const isDuplicate = uploadedImages.some(img => 
                img.name === file.name && img.size === file.size
            );
            
            if (!isDuplicate) {
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    uploadedImages.push({
                        id: Date.now() + i, // ID único
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        data: e.target.result // Data URL
                    });
                    
                    updateImagePreview();
                };
                
                reader.readAsDataURL(file);
            }
        } else {
            alert('Por favor, selecione apenas arquivos de imagem.');
        }
    }
    
    // Limpar o input de arquivo para permitir selecionar os mesmos arquivos novamente
    event.target.value = '';
}

// Função para converter Data URL para Blob
function dataURLtoBlob(dataURL) {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new Blob([u8arr], { type: mime });
}

// Atualizar preview de imagens
function updateImagePreview() {
    const previewContainer = document.getElementById('previewContainer');
    previewContainer.innerHTML = '';
    
    if (uploadedImages.length === 0) {
        previewContainer.innerHTML = '<div class="no-images">Nenhuma imagem selecionada</div>';
        return;
    }
    
    uploadedImages.forEach(image => {
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-item';
        previewItem.dataset.id = image.id;
        
        previewItem.innerHTML = `
            <img src="${image.data}" alt="${image.name}" class="preview-image">
            <div class="preview-info">${image.name}</div>
            <button type="button" class="btn-delete-image" onclick="deleteImage(${image.id})" title="Remover imagem">×</button>
        `;
        
        previewContainer.appendChild(previewItem);
    });
}

// Deletar imagem
function deleteImage(imageId) {
    uploadedImages = uploadedImages.filter(img => img.id !== imageId);
    updateImagePreview();
}

// Limpar formulário
function clearForm() {
    if (confirm('Tem certeza que deseja limpar todos os campos?')) {
        document.getElementById('desembarqueForm').reset();
        document.getElementById('outroDestinacaoContainer').classList.add('hidden');
        document.getElementById('outroArtePescaContainer').classList.add('hidden');
        
        // Limpar imagens
        uploadedImages = [];
        updateImagePreview();
        
        // Manter apenas uma linha na tabela de espécies
        const table = document.getElementById('especiesTable').getElementsByTagName('tbody')[0];
        while (table.rows.length > 1) {
            table.deleteRow(1);
        }
        
        // Resetar select de embarcação
        preencherSelectEmbarcacoes();
    }
}

// Processar envio do formulário
async function handleSubmit(event) {
    event.preventDefault();
    
    // Validar formulário
    if (validarFormulario()) {
        try {
            // Mostrar loading
            const submitBtn = event.target.querySelector('.btn-submit');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Enviando...';
            submitBtn.disabled = true;

            // Criar FormData a partir do formulário
            const formData = new FormData(event.target);
            
            // Adicionar imagens ao FormData (CORRIGIDO)
            uploadedImages.forEach((image) => {
                // Converter data URL para blob
                const blob = dataURLtoBlob(image.data);
                formData.append('imagens', blob, image.name);
            });

            console.log('Enviando formulário com', uploadedImages.length, 'imagens');

            // Enviar para o servidor
            const response = await fetch('/api/desembarques', {
                method: 'POST',
                body: formData // Não definir Content-Type, o browser fará automaticamente com boundary
            });

            const result = await response.json();

            if (result.success) {
                alert('Desembarque registrado com sucesso!');
                console.log('Dados salvos:', result.data);
                
                // Limpar formulário após envio
                clearForm();
            } else {
                throw new Error(result.message || 'Erro ao salvar desembarque');
            }

        } catch (error) {
            console.error('❌ Erro ao enviar formulário:', error);
            alert('Erro ao enviar formulário: ' + error.message);
        } finally {
            // Restaurar botão
            const submitBtn = event.target.querySelector('.btn-submit');
            submitBtn.textContent = 'Enviar Registro';
            submitBtn.disabled = false;
        }
    }
}

// Validar formulário
function validarFormulario() {
    // Verificar se há pelo menos uma espécie com nome e quantidade
    const especies = document.getElementsByName('especie[]');
    const quantidades = document.getElementsByName('quantidade[]');
    
    let especiesValidas = false;
    
    for (let i = 0; i < especies.length; i++) {
        if (especies[i].value.trim() !== '' && quantidades[i].value.trim() !== '') {
            especiesValidas = true;
            break;
        }
    }
    
    if (!especiesValidas) {
        alert('Por favor, adicione pelo menos uma espécie com nome e quantidade.');
        return false;
    }
    
    // Verificar se "Outro" foi selecionado mas não especificado
    const destinacao = document.getElementById('destinacao').value;
    const outroDestinacao = document.getElementById('outroDestinacao').value;
    
    if (destinacao === 'Outro' && outroDestinacao.trim() === '') {
        alert('Por favor, especifique a destinação.');
        return false;
    }
    
    const artePesca = document.getElementById('artePesca').value;
    const outroArtePesca = document.getElementById('outroArtePesca').value;
    
    if (artePesca === 'Outro' && outroArtePesca.trim() === '') {
        alert('Por favor, especifique a arte de pesca.');
        return false;
    }
    
    return true;
}