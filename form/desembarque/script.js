// script.js
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar o formulário
    initForm();
    
    // Adicionar event listeners para calcular esforço
    document.getElementById('dataInicioPesca').addEventListener('change', calcularEsforco);
    document.getElementById('dataFimPesca').addEventListener('change', calcularEsforco);
    
    // Adicionar event listener para preview de imagens
    document.getElementById('imagens').addEventListener('change', previewImagens);
    
    // Adicionar event listener para o envio do formulário
    document.getElementById('desembarqueForm').addEventListener('submit', handleSubmit);
});

// Inicializar o formulário
function initForm() {
    // Preencher cidades do Espírito Santo
    const cidadesES = [
        "Afonso Cláudio", "Água Doce do Norte", "Águia Branca", "Alegre", "Alfredo Chaves", 
        "Alto Rio Novo", "Anchieta", "Apiacá", "Aracruz", "Atilio Vivacqua", 
        "Baixo Guandu", "Barra de São Francisco", "Boa Esperança", "Bom Jesus do Norte", 
        "Brejetuba", "Cachoeiro de Itapemirim", "Cariacica", "Castelo", "Colatina", 
        "Conceição da Barra", "Conceição do Castelo", "Divino de São Lourenço", "Domingos Martins", 
        "Dores do Rio Preto", "Ecoporanga", "Fundão", "Governador Lindenberg", "Guaçuí", 
        "Guarapari", "Ibatiba", "Ibiraçu", "Ibitirama", "Iconha", "Irupi", "Itaguaçu", 
        "Itapemirim", "Itarana", "Iúna", "Jaguaré", "Jerônimo Monteiro", "João Neiva", 
        "Laranja da Terra", "Linhares", "Mantenópolis", "Marataízes", "Marechal Floriano", 
        "Marilândia", "Mimoso do Sul", "Montanha", "Mucurici", "Muniz Freire", "Muqui", 
        "Nova Venécia", "Pancas", "Pedro Canário", "Pinheiros", "Piúma", "Ponto Belo", 
        "Presidente Kennedy", "Rio Bananal", "Rio Novo do Sul", "Santa Leopoldina", 
        "Santa Maria de Jetibá", "Santa Teresa", "São Domingos do Norte", "São Gabriel da Palha", 
        "São José do Calçado", "São Mateus", "São Roque do Canaã", "Serra", "Sooretama", 
        "Vargem Alta", "Venda Nova do Imigrante", "Viana", "Vila Pavão", "Vila Valério", 
        "Vila Velha", "Vitória"
    ];
    
    const selectLocal = document.getElementById('localDesembarque');
    cidadesES.forEach(cidade => {
        const option = document.createElement('option');
        option.value = cidade;
        option.textContent = cidade;
        selectLocal.appendChild(option);
    });
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

// Pré-visualizar imagens selecionadas
function previewImagens(event) {
    const previewContainer = document.getElementById('previewContainer');
    previewContainer.innerHTML = '';
    
    const files = event.target.files;
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (file.type.match('image.*')) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.classList.add('preview-image');
                previewContainer.appendChild(img);
            };
            
            reader.readAsDataURL(file);
        }
    }
}

// Limpar formulário
function clearForm() {
    if (confirm('Tem certeza que deseja limpar todos os campos?')) {
        document.getElementById('desembarqueForm').reset();
        document.getElementById('previewContainer').innerHTML = '';
        document.getElementById('outroDestinacaoContainer').classList.add('hidden');
        document.getElementById('outroArtePescaContainer').classList.add('hidden');
        
        // Manter apenas uma linha na tabela de espécies
        const table = document.getElementById('especiesTable').getElementsByTagName('tbody')[0];
        while (table.rows.length > 1) {
            table.deleteRow(1);
        }
    }
}

// Processar envio do formulário
function handleSubmit(event) {
    event.preventDefault();
    
    // Validar formulário
    if (validarFormulario()) {
        // Aqui você pode enviar os dados para um servidor
        // Por enquanto, apenas mostra os dados no console
        const formData = new FormData(event.target);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            if (key === 'especie[]' || key === 'quantidade[]') {
                if (!data.especies) data.especies = [];
                const index = key === 'especie[]' ? 0 : 1;
                
                if (!data.especies[data.especies.length - 1]) {
                    data.especies.push(['', '']);
                }
                
                data.especies[data.especies.length - 1][index] = value;
            } else {
                data[key] = value;
            }
        }
        
        console.log('Dados do formulário:', data);
        alert('Formulário enviado com sucesso! Verifique o console para ver os dados.');
        
        // Limpar formulário após envio
        clearForm();
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