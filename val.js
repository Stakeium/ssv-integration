const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

function findDepositCli() {
  const possiblePaths = [
    './deposit',
    './staking-deposit-cli/deposit',
    './staking_deposit-cli-fdab65d-linux-amd64/deposit',
    path.join(__dirname, 'staking-deposit-cli', 'deposit'),
    path.join(__dirname, 'staking_deposit-cli-fdab65d-linux-amd64', 'deposit'),
  ];

  for (const cliPath of possiblePaths) {
    if (fs.existsSync(cliPath)) {
      return cliPath;
    }
  }

  return null;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function generateValidatorKeys(numValidators, chain, password) {
  return new Promise(async (resolve, reject) => {
    const depositCliPath = findDepositCli();

    if (!depositCliPath) {
      reject(new Error('Deposit CLI not found. Please ensure it\'s installed and provide the correct path.'));
      return;
    }

    console.log(`Using deposit CLI at: ${depositCliPath}`);

    const depositProcess = spawn(depositCliPath, ['new-mnemonic', '--num_validators', numValidators.toString(), '--chain', chain], {
      cwd: path.dirname(depositCliPath),
    });

    let stdout = '';
    let stderr = '';
    let mnemonic = '';

    depositProcess.stdout.on('data', async (data) => {
      const output = data.toString();
      console.log('Received stdout:', output);
      stdout += output;

      if (output.includes('Please choose your language')) {
        depositProcess.stdin.write(`3\n`); // Choose English
      } else if (output.includes('Please choose the language of the mnemonic')) {
        depositProcess.stdin.write(`4\n`); // Choose English for mnemonic
      } else if (output.includes('Create a password')) {
        depositProcess.stdin.write(`${password}\n`);
      } else if (output.includes('Repeat your keystore password')) {
        depositProcess.stdin.write(`${password}\n`);
      } else if (output.includes('This is your mnemonic')) {
        const mnemonicMatch = output.match(/This is your mnemonic.*?\n(.*?)\n/s);
        if (mnemonicMatch) {
          mnemonic = mnemonicMatch[1].trim();
          console.log('Mnemonic:', mnemonic);
        }
      } else if (output.includes('Please type your mnemonic')) {
        const mnemonicWords = mnemonic.split(' ').map(word => word.slice(0, 4)).join(' ');
        depositProcess.stdin.write(`${mnemonicWords}\n`);
      }
    });

    depositProcess.stderr.on('data', (data) => {
      console.error('Received stderr:', data.toString());
      stderr += data.toString();
    });

    depositProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Process exited with code ${code}`);
        reject(new Error(stderr));
        return;
      }

      console.log('stdout:', stdout);
      console.error('stderr:', stderr);

      const keystorePathMatch = stdout.match(/Your keys can be found at: (.*)/);
      if (mnemonic && keystorePathMatch) {
        const keystorePath = keystorePathMatch[1].trim();
        resolve({ mnemonic, keystorePath });
      } else {
        reject(new Error('Failed to extract keystore path from output'));
      }
    });
  });
}

// Usage
generateValidatorKeys(1, 'holesky/testnet', 'Password@124')
  .then(({ mnemonic, keystorePath }) => {
    console.log('Mnemonic:', mnemonic);
    console.log('Keystore path:', keystorePath);
  })
  .catch(console.error);

