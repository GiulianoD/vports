ter a aba vulgo para salvar nome

são 3 monitores, e cada um ficará responsável por X localidades.
pode ser feito um usuário para cada, e nas localidades filtrar somente as que cada um é responsável

gerar um arquivo para salvar a API base, e a porta. <br>
atualmente, estas informações são declaradas por todos os arquivos .js do projeto <br>
```
// em todos os .js (exceto server.js)
const API_BASE = 'http://localhost:3000/api';

// server,js
const port = 3000;
```
<br>
desembarque: <br>
Adicionar "Atravessador" em Destinação <br>
Adicionar "Mergulho" e "Tarrafa" em "Arte de Pesca", e remover "Rede emalhar de fundo" e "Rede emalhar de meia água"<br>
Adicionar Valor Total das Despesas da Pesca na aba Desembarque<br>
Adicionar valor médio do Kg da espécie<br>
Adicionar droplist de nome de espécie<br>
Adicionar um mapa para substituir a localização<br>
<br><br><br>
Incluir no desembarque pesqueiro um tópico de Custos da Pesca:<br>
<br>
R$ (Gelo)<br>
R$ (Rancho)<br>
R$ (óleo)<br>
<br>
Total: calcular automaticamente.<br>
<br>
Não esquece de no tópico ao lado da espécie, colocar também R$ médio/espécie e calcular automaticamente o valor do peixe pelo kg.<br>
