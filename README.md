# blawsite

Source code for my personal website featuring an interactive 3D WebGL particle constellation background and sleek glassmorphic responsive layout.

## Local Development on Linux

Follow these steps to set up and run the site locally:

### 1. Load Node.js (via NVM)

The project requires Node.js v24+. Load your NVM environment and verify:

```bash
source ~/.nvm/nvm.sh
node --version # Should display v24.15.0 or newer
npm --version
```

### 2. Install Dependencies

Install the required npm packages (including Dart Sass for stylesheet compilation):

```bash
npm install
```

### 3. Build Stylesheets

Compile the modern SCSS stylesheets into static CSS:

```bash
# One-time build
npm run build

# Continuous Sass compilation (optional, if you're editing SCSS files)
npx sass --watch src/style/main.scss:dist/style/main.css
```

### 4. Run Server

Launch the lightweight Node.js development server:

```bash
node server.js
```

The site will be hosted locally. Open your browser and navigate to:
[http://localhost:8080](http://localhost:8080)11