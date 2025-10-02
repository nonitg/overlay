# Build Tutorial - Nonit's Assistant

## Prerequisites
- **Node.js** (v18 or higher)
- **npm** or **pnpm**
- **Git**

## Quick Setup (After Git Clone)

### 1. Install Dependencies
```bash
npm install
# or
pnpm install
```

### 2. Development Mode
```bash
npm run app:dev
```
This starts both the Vite dev server and Electron app.

## Building for Distribution

### 3. Build for Current Platform
```bash
npm run app:build
```
This creates a distributable app for your current operating system.


## Output Location
Built apps are saved in the `release/` directory. You can move this to the "applications" folder. 

## Troubleshooting

### Common Issues:
1. **Permission errors**: The app needs Screen Recording permissions
2. **Antivirus warnings**: The app uses stealth techniques that may trigger false positives
3. **Build failures**: Ensure all dependencies are installed and Node.js version is correct

### Clean Build:
```bash
npm run clean
npm run app:build
```

## Notes
- The app requires elevated permissions for screenshot functionality
- First run may prompt for accessibility permissions
- Built apps are code-signed on macOS (if certificates are available)
