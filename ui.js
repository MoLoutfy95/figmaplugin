// Figma Plugin UI JavaScript
let extractedTokens = null;
let convertedFiles = [];
let githubUser = null;
let githubRepo = null;

// DOM Elements
const extractBtn = document.getElementById('extractBtn');
const convertBtn = document.getElementById('convertBtn');
const exportBtn = document.getElementById('exportBtn');
const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const uploadText = document.getElementById('uploadText');
const tokenPreview = document.getElementById('tokenPreview');
const tokenContent = document.getElementById('tokenContent');
const formatOptions = document.querySelectorAll('.format-option');
const githubToken = document.getElementById('githubToken');
const githubUrl = document.getElementById('githubUrl');
const loginBtn = document.getElementById('loginBtn');
const pushBtn = document.getElementById('pushBtn');
const githubLogin = document.getElementById('githubLogin');
const githubLoggedIn = document.getElementById('githubLoggedIn');
const repoStatus = document.getElementById('repoStatus');
const branchSelect = document.getElementById('branchSelect');
const commitMessage = document.getElementById('commitMessage');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const autoPushIndicator = document.getElementById('autoPushIndicator');

// Event Listeners
extractBtn.addEventListener('click', extractTokens);
convertBtn.addEventListener('click', convertTokens);
exportBtn.addEventListener('click', exportFiles);
fileInput.addEventListener('change', handleFileUpload);
uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', handleDragOver);
uploadArea.addEventListener('drop', handleDrop);
loginBtn.addEventListener('click', handleGitHubLogin);
pushBtn.addEventListener('click', pushToGitHub);

// Format selection
formatOptions.forEach(option => {
  option.addEventListener('click', () => {
    const checkbox = option.querySelector('input');
    checkbox.checked = !checkbox.checked;
    option.classList.toggle('selected', checkbox.checked);
    updateConvertButton();
  });
});

// Initialize format options
formatOptions.forEach(option => {
  const checkbox = option.querySelector('input');
  option.classList.toggle('selected', checkbox.checked);
});

// File Upload Handlers
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (file && file.type === 'application/json') {
    processUploadedFile(file);
  } else {
    parent.postMessage({ pluginMessage: { type: 'notify', message: 'Please select a valid JSON file' } }, '*');
  }
}

function handleDragOver(event) {
  event.preventDefault();
  uploadArea.style.borderColor = '#18a0fb';
}

function handleDrop(event) {
  event.preventDefault();
  uploadArea.style.borderColor = '#404040';
  
  const file = event.dataTransfer.files[0];
  if (file && file.type === 'application/json') {
    processUploadedFile(file);
  } else {
    parent.postMessage({ pluginMessage: { type: 'notify', message: 'Please drop a valid JSON file' } }, '*');
  }
}

async function processUploadedFile(file) {
  try {
    const content = await file.text();
    const jsonContent = JSON.parse(content);
    
    extractedTokens = jsonContent;
    
    // Update UI
    uploadArea.classList.add('has-file');
    uploadText.innerHTML = `<div class="upload-text success">✅ ${file.name}<br><small>File loaded successfully</small></div>`;
    
    // Show token preview
    tokenContent.textContent = JSON.stringify(jsonContent, null, 2);
    tokenPreview.classList.remove('hidden');
    
    updateConvertButton();
    
    parent.postMessage({ 
      pluginMessage: { 
        type: 'notify', 
        message: 'JSON file loaded successfully!' 
      } 
    }, '*');
    
  } catch (error) {
    parent.postMessage({ 
      pluginMessage: { 
        type: 'notify', 
        message: 'Error reading JSON file. Please check the file format.' 
      } 
    }, '*');
  }
}

// Extract tokens from Figma
function extractTokens() {
  extractBtn.disabled = true;
  extractBtn.innerHTML = '<span class="loading"></span>Extracting...';
  
  parent.postMessage({ pluginMessage: { type: 'extract-tokens' } }, '*');
}

// Convert tokens to different formats
function convertTokens() {
  if (!extractedTokens) return;
  
  const selectedFormats = Array.from(document.querySelectorAll('.format-option input:checked'))
    .map(input => input.id);
  
  if (selectedFormats.length === 0) {
    parent.postMessage({ pluginMessage: { type: 'notify', message: 'Please select at least one format' } }, '*');
    return;
  }
  
  convertBtn.disabled = true;
  convertBtn.innerHTML = '<span class="loading"></span>Converting...';
  
  convertedFiles = [];
  
  selectedFormats.forEach(format => {
    const content = generateConvertedContent(extractedTokens, format);
    const extension = getFileExtension(format);
    convertedFiles.push({
      name: `tokens.${extension}`,
      content: content,
      format: format
    });
  });
  
  setTimeout(() => {
    convertBtn.disabled = false;
    convertBtn.textContent = 'Convert Tokens';
    exportBtn.disabled = false;
    pushBtn.disabled = false;
    
    // Auto push if main branch is selected and files are converted
    if (githubRepo && branchSelect.value === 'main' && convertedFiles.length > 0) {
      setTimeout(() => {
        pushToGitHub();
      }, 500);
    }
    
    parent.postMessage({ 
      pluginMessage: { 
        type: 'notify', 
        message: `Converted to ${selectedFormats.length} format(s)` 
      } 
    }, '*');
  }, 1000);
}

// Generate converted content (same logic as main app)
function generateConvertedContent(tokens, format) {
  const flatTokens = flattenTokens(tokens);
  
  switch (format) {
    case 'css':
      return generateCSS(flatTokens);
    case 'swift':
      return generateSwift(flatTokens);
    case 'kotlin':
      return generateKotlin(flatTokens);
    case 'dart':
      return generateDart(flatTokens);
    default:
      return JSON.stringify(tokens, null, 2);
  }
}

// Flatten nested tokens
function flattenTokens(obj, prefix = '') {
  const result = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const tokenName = prefix ? `${prefix}-${key}` : key;
    
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (value.hasOwnProperty('value')) {
        result[tokenName] = value.value;
      } else {
        Object.assign(result, flattenTokens(value, tokenName));
      }
    } else {
      result[tokenName] = value;
    }
  }
  
  return result;
}

// Format generators
function generateCSS(tokens) {
  const cssVars = Object.entries(tokens)
    .map(([name, value]) => `  --${name.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value};`)
    .join('\n');
  
  return `:root {\n${cssVars}\n}`;
}

function generateSwift(tokens) {
  const swiftTokens = Object.entries(tokens)
    .map(([name, value]) => {
      const camelName = name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      const swiftValue = getSwiftValue(value);
      
      if (swiftValue.includes('Color(hex:') || swiftValue.includes('Color.')) {
        return `    static let ${camelName} = ${swiftValue}`;
      } else if (swiftValue.includes('Font.Weight.')) {
        return `    static let ${camelName} = ${swiftValue}`;
      } else if (swiftValue.startsWith('"') && swiftValue.endsWith('"')) {
        return `    static let ${camelName}: String = ${swiftValue}`;
      } else {
        return `    static let ${camelName}: CGFloat = ${swiftValue}`;
      }
    })
    .join('\n');
  
  return `import SwiftUI\n\nstruct DesignTokens {\n${swiftTokens}\n}`;
}

function generateKotlin(tokens) {
  const kotlinTokens = Object.entries(tokens)
    .map(([name, value]) => {
      const camelName = name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      return `    val ${camelName} = ${getKotlinValue(value)}`;
    })
    .join('\n');
  
  return `import androidx.compose.ui.graphics.Color\nimport androidx.compose.ui.unit.dp\n\nobject DesignTokens {\n${kotlinTokens}\n}`;
}

function generateDart(tokens) {
  const dartTokens = Object.entries(tokens)
    .map(([name, value]) => {
      const camelName = name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      const dartValue = getDartValue(value);
      
      if (dartValue.includes('Color(')) {
        return `  static const Color ${camelName} = ${dartValue};`;
      } else {
        return `  static const double ${camelName} = ${dartValue};`;
      }
    })
    .join('\n');
  
  return `import 'package:flutter/material.dart';\n\nclass DesignTokens {\n${dartTokens}\n}`;
}

// Value converters
function getSwiftValue(value) {
  if (typeof value === 'string' && value.startsWith('#')) {
    return `Color(hex: "${value.toLowerCase()}")`;
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  return `"${value}"`;
}

function getKotlinValue(value) {
  if (typeof value === 'string' && value.startsWith('#')) {
    const hex = value.replace('#', '').toUpperCase();
    return `Color(0xFF${hex})`;
  }
  if (typeof value === 'number') {
    return `${value}.dp`;
  }
  return `"${value}"`;
}

function getDartValue(value) {
  if (typeof value === 'string' && value.startsWith('#')) {
    const hex = value.replace('#', '').toUpperCase();
    return `Color(0xFF${hex})`;
  }
  if (typeof value === 'number') {
    return `${value}.0`;
  }
  return `"${value}"`;
}

function getFileExtension(format) {
  const extensions = {
    css: 'css',
    swift: 'swift',
    kotlin: 'kt',
    dart: 'dart'
  };
  return extensions[format] || 'txt';
}

// Export files
function exportFiles() {
  if (convertedFiles.length === 0) return;
  
  // In Figma plugin, we'll show the content in a modal or copy to clipboard
  const content = convertedFiles.map(file => 
    `// ${file.name}\n${file.content}\n\n`
  ).join('---\n\n');
  
  // Copy to clipboard
  navigator.clipboard.writeText(content).then(() => {
    parent.postMessage({ 
      pluginMessage: { 
        type: 'notify', 
        message: 'Files copied to clipboard!' 
      } 
    }, '*');
  });
}

// GitHub Integration
async function handleGitHubLogin() {
  const token = githubToken.value.trim();
  const url = githubUrl.value.trim();
  
  if (!token) {
    parent.postMessage({ pluginMessage: { type: 'notify', message: 'Please enter GitHub token' } }, '*');
    return;
  }
  
  loginBtn.disabled = true;
  loginBtn.innerHTML = '<span class="loading"></span>Connecting...';
  
  try {
    // Login to GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!userResponse.ok) {
      throw new Error('Invalid GitHub token');
    }
    
    githubUser = await userResponse.json();
    
    // Check repository if URL provided
    if (url) {
      await checkRepository(token, url);
    }
    
    // Switch to logged in view
    githubLogin.classList.add('hidden');
    githubLoggedIn.classList.remove('hidden');
    
    // Update user info
    userAvatar.src = githubUser.avatar_url;
    userName.textContent = `✅ Welcome, ${githubUser.name || githubUser.login}!`;
    
    showStatus('success', `Connected as ${githubUser.name || githubUser.login}`);
    
  } catch (error) {
    showStatus('error', error.message);
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Login & Check Repo';
  }
}

async function checkRepository(token, url) {
  const urlParts = url.replace('https://github.com/', '').split('/');
  if (urlParts.length < 2) {
    throw new Error('Invalid GitHub URL');
  }
  
  const owner = urlParts[0];
  const repoName = urlParts[1];
  
  // Check repository
  const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });
  
  if (!repoResponse.ok) {
    throw new Error('Repository not found or no access');
  }
  
  githubRepo = await repoResponse.json();
  
  // Get branches
  const branchesResponse = await fetch(`https://api.github.com/repos/${owner}/${repoName}/branches`, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });
  
  if (branchesResponse.ok) {
    const branches = await branchesResponse.json();
    populateBranches(branches);
  }
}

function populateBranches(branches) {
  branchSelect.innerHTML = '';
  branches.forEach(branch => {
    const option = document.createElement('option');
    option.value = branch.name;
    option.textContent = branch.name + (branch.name === githubRepo.default_branch ? ' (default)' : '');
    branchSelect.appendChild(option);
  });
  branchSelect.value = githubRepo.default_branch;
  
  // Show auto push indicator if main branch and files exist
  updateAutoPushIndicator();
  
  // Add event listener for branch changes
  branchSelect.addEventListener('change', () => {
    updateAutoPushIndicator();
    
    // Auto push if main branch is selected and files exist
    if (branchSelect.value === 'main' && convertedFiles.length > 0) {
      setTimeout(() => {
        pushToGitHub();
      }, 500);
    }
  });
}

function updateAutoPushIndicator() {
  if (branchSelect.value === 'main' && convertedFiles.length > 0) {
    autoPushIndicator.classList.remove('hidden');
  } else {
    autoPushIndicator.classList.add('hidden');
  }
}

async function pushToGitHub() {
  if (!githubUser || !githubRepo || !branchSelect.value) {
    console.log('Missing requirements for push');
    return;
  }
  
  if (convertedFiles.length === 0) {
    console.log('No converted files to push');
    return;
  }

  pushBtn.disabled = true;
  pushBtn.innerHTML = '<span class="loading"></span>Pushing...';

  try {
    const token = githubToken.value;
    const branch = branchSelect.value;
    const message = commitMessage.value || 'Update design tokens';

    for (const file of convertedFiles) {
      const content = btoa(unescape(encodeURIComponent(file.content)));
      
      // Check if file exists first
      let sha = null;
      try {
        const existingFileResponse = await fetch(`https://api.github.com/repos/${githubRepo.full_name}/contents/design-tokens/${file.name}?ref=${branch}`, {
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        
        if (existingFileResponse.ok) {
          const existingFile = await existingFileResponse.json();
          sha = existingFile.sha;
        }
      } catch (error) {
        // File doesn't exist, which is fine
      }
      
      const requestBody = {
        message: `${message} - ${file.name}`,
        content: content,
        branch: branch
      };
      
      if (sha) {
        requestBody.sha = sha;
      }
      
      const response = await fetch(`https://api.github.com/repos/${githubRepo.full_name}/contents/design-tokens/${file.name}`, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('GitHub API Error:', errorData);
        throw new Error(`Failed to upload ${file.name}`);
      }
    }

    showStatus('success', `Successfully pushed ${convertedFiles.length} files!`);
    
    parent.postMessage({ 
      pluginMessage: { 
        type: 'notify', 
        message: `Successfully pushed ${convertedFiles.length} files to ${githubRepo.full_name}!` 
      } 
    }, '*');

  } catch (error) {
    showStatus('error', `Push failed: ${error.message}`);
    parent.postMessage({ 
      pluginMessage: { 
        type: 'notify', 
        message: `Push failed: ${error.message}` 
      } 
    }, '*');
  } finally {
    pushBtn.disabled = false;
    pushBtn.textContent = 'Push to GitHub';
  }
}

function showStatus(type, message) {
  repoStatus.className = `status-indicator status-${type}`;
  repoStatus.textContent = message;
}

function updateConvertButton() {
  const hasSelectedFormats = document.querySelectorAll('.format-option input:checked').length > 0;
  convertBtn.disabled = !extractedTokens || !hasSelectedFormats;
  
  // Enable export and push buttons if we have converted files
  if (convertedFiles.length > 0) {
    exportBtn.disabled = false;
    if (githubRepo && branchSelect.value) {
      pushBtn.disabled = false;
    }
  }
}

// Listen for messages from plugin code
window.onmessage = (event) => {
  const { type, tokens } = event.data.pluginMessage;
  
  if (type === 'tokens-extracted') {
    extractedTokens = tokens;
    extractBtn.disabled = false;
    extractBtn.textContent = 'Extract Design Tokens from Figma';
    
    // Show token preview
    tokenContent.textContent = JSON.stringify(tokens, null, 2);
    tokenPreview.classList.remove('hidden');
    
    updateConvertButton();
    
    parent.postMessage({ 
      pluginMessage: { 
        type: 'notify', 
        message: 'Design tokens extracted successfully!' 
      } 
    }, '*');
  }
};