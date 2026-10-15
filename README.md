# Paint.NET Mobile (PaintDroid) para Android

Reconstrução moderna, responsiva e acelerada por hardware das funcionalidades fundamentais do **Paint.NET** para dispositivos móveis **Android**.

---

## 🎨 Funcionalidades Implementadas

### 1. Sistema de Camadas (Layers)
- Suporte a múltiplas camadas simultâneas.
- Alternância de visibilidade (ocultar/exibir).
- Controle de opacidade individual (0% a 100%).
- Modos de mesclagem (Blend Modes): `Normal`, `Multiply`, `Screen`, `Overlay`, `Darken`, `Lighten`, `Difference`.
- Operações de camadas: Adicionar, Duplicar, Excluir, Mesclar para Baixo (`Merge Down`) e Reordenar (subir/descer).

### 2. Caixa de Ferramentas (Toolbox)
- **Varinha Mágica (Magic Wand)**: Seleção de áreas de cores semelhantes com algoritmo contíguo e máscara visual estilo Paint.NET (azul semi-transparente com contorno ciano).
- **Tolerância em Tempo Real**: Ajuste o slider de tolerância (0% a 100%) ou arraste com a varinha para ver a área selecionada expandir ou encolher dinamicamente na tela.
- **Deletar Seleção**: Botão `🗑️ Deletar Seleção` ou teclas `Delete`/`Backspace` para apagar os pixels da área selecionada transformando-os em 100% transparentes.
- **Pincel (Brush)**: Traço suave com espessura ajustável (1px a 100px).
- **Lápis (Pencil)**: Desenho pixel-art nítido com algoritmo de Bresenham (sem anti-aliasing).
- **Borracha (Eraser)**: Apaga pixels com respeito à transparência alfa da camada ativa.
- **Balde de Tinta (Flood Fill)**: Preenchimento contíguo de área com controle de tolerância de cor (0% a 100%).
- **Formas Geométricas**: Retângulo, Retângulo Cheio, Elipse, Elipse Cheia e Linha Reta.
- **Conta-gotas (Eyedropper)**: Captura a cor diretamente do composto visível da imagem.
- **Texto**: Inserção de texto com tamanho dinâmico.
- **Gestos Touch**: Zoom com dois dedos (Pinch-to-zoom) e arrastar tela (Pan) mantendo o desenho suave com um dedo.

### 2.1 Remoção de Fundo e Exportação em PNG Transparente
- Ao abrir uma imagem (`📂 Abrir`), o app carrega o arquivo em suas dimensões originais sobre fundo transparente direto.
- Use a **Varinha Mágica** para clicar no fundo da imagem e clique em **Deletar Seleção** (ou aperte `Delete`).
- Ao clicar em `💾 Salvar PNG`, o arquivo exportado preserva a transparência alfa real (ideal para figurinhas, logos e adesivos).

### 3. Painel de Cores Estilo Paint.NET
- Seletor circular de cores HSV com controle de luminosidade/valor.
- Caixa de Cor Primária e Secundária com alternância rápida (botão `⇄`).
- Paleta rápida de 20 cores clássicas do Paint.NET.

### 4. Filtros e Ajustes de Imagem
- **Brilho e Contraste**: Sliders dinâmicos com faixa de -100 a +100.
- **Matiz e Saturação (HSL)**: Ajuste de tom de cor e vivacidade.
- **Desfoque (Blur)**: Desfoque gaussiano ajustável.
- **Pixelate (Mosaico)**: Efeito de pixelização com tamanho de bloco configurável.
- **Inverter Cores** e **Preto e Branco (Grayscale)** em um clique.

### 5. Histórico e Exportação
- Histórico completo de Desfazer (`Undo`) e Refazer (`Redo`) com suporte a atalhos de teclado (`Ctrl+Z`, `Ctrl+Y`).
- Abertura de imagens do dispositivo ou galeria em uma nova camada.
- Exportação de imagem final em alta resolução no formato **PNG**.

---

## 🚀 Como Testar Localmente

Na pasta do projeto (`C:\Users\LENOVO\.gemini\antigravity\scratch\paint_android`):

```bash
# Iniciar o servidor de desenvolvimento
npm run dev
```

Você pode acessar no navegador do computador ou no navegador do celular (usando o IP local exibido no terminal).

---

## 📱 Como Gerar o APK para Android

O projeto nativo Android já foi estruturado e sincronizado usando o **Capacitor** dentro da pasta `android/`.

### Opção A: Pelo Android Studio (Recomendado)
1. Abra o **Android Studio**.
2. Clique em **Open** e selecione a pasta:
   `C:\Users\LENOVO\.gemini\antigravity\scratch\paint_android\android`
3. Aguarde a sincronização do Gradle.
4. No menu superior, clique em:
   **Build > Build Bundle(s) / APK(s) > Build APK(s)**
5. O Android Studio gerará o arquivo `.apk` pronto para instalar no seu aparelho celular.

### Opção B: Pela Linha de Comando (Gradle)
Certifique-se de ter o **JDK 17+** instalado e a variável `JAVA_HOME` configurada:

```powershell
cd C:\Users\LENOVO\.gemini\antigravity\scratch\paint_android\android
.\gradlew.bat assembleDebug
```

O arquivo gerado estará em:
`android/app/build/outputs/apk/debug/app-debug.apk`
