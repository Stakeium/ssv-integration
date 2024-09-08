const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { SSVKeys } = require('ssv-keys');

const app = express();
app.use(express.json());

app.post('/api/create-validator', async (req, res) => {
  const { withdrawalAddress, password } = req.body;

  try {
    // Define the directory and command
    const directoryPath = path.join(__dirname, 'staking_deposit-cli-fdab65d-linux-amd64');
    const command = './deposit';
    const args = [
      'new-mnemonic',
      '--num_validators', '1',
      '--chain', 'holesky',
      '--eth1_withdrawal_address', withdrawalAddress
    ];

    // Create a function to handle the interactive process
    const handleInteractiveProcess = () => {
      return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
          cwd: directoryPath,
          shell: '/bin/bash',
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';
        let inputSent = false;

        child.stdout.on('data', (data) => {
          stdout += data.toString();
          console.log('stdout:', data.toString());  // Log stdout for debugging

          // Handle prompts dynamically based on detected text
          if (data.toString().includes('Please choose your language') && !inputSent) {
            child.stdin.write('3\n');  // Choose '3' for English
            inputSent = true;
          }
          if (data.toString().includes('Repeat your execution address for confirmation') && inputSent) {
            child.stdin.write(`${withdrawalAddress}\n`);  // Confirm address
          }
          if (data.toString().includes('Please choose the language of the mnemonic word list')) {
            child.stdin.write('4\n');  // Choose '4' for English mnemonic word list
          }
          if (data.toString().includes('Create a password that secures your validator keystore(s). You will need to re-enter this to decrypt them when you setup your Ethereum validators.:')) {
            child.stdin.write(`rasnh@12kjsdewl\n`);  // Enter password
            child.stdin.write(`rasnh@12kjsdewl\n`);  // Confirm password
          }
        });

        child.stderr.on('data', (data) => {
          stderr += data.toString();
          console.error('stderr:', data.toString());  // Log stderr for debugging
        });

        child.on('error', (error) => {
          reject(`Error: ${error.message}`);
        });

        child.on('exit', (code) => {
          if (code !== 0) {
            reject(`Process exited with code ${code}`);
          } else {
            resolve(stdout);
          }
        });
      });
    };

    const stdout = await handleInteractiveProcess();

    // Extract necessary information from stdout
    const mnemonicMatch = stdout.match(/This is your mnemonic \(seed phrase\)\. Write it down and store it safely\. It is the ONLY way to retrieve your deposit\.\n([\w\s]+)\n/);
    const keystorePathMatch = stdout.match(/Your keys can be found at: (.+)/);

    if (!mnemonicMatch || !keystorePathMatch) {
      console.error('Failed to parse mnemonic or keystore path from stdout');
      return res.status(500).json({ error: 'Failed to extract necessary information' });
    }

    const mnemonic = mnemonicMatch[1].trim();
    const keystorePath = keystorePathMatch[1].trim();

    // Use SSV Keys SDK to distribute keys
    const ssvKeys = new SSVKeys();
    const { privateKey } = await ssvKeys.extractKeys(keystorePath, password);

    const operators = [
      { id: 1, publicKey: 'operator1PublicKey' },
      { id: 2, publicKey: 'operator2PublicKey' },
      { id: 3, publicKey: 'operator3PublicKey' },
      { id: 4, publicKey: 'operator4PublicKey' },
    ];

    const encryptedShares = await ssvKeys.buildShares(privateKey, operators);

    // Send encrypted shares to SSV network (this step would depend on SSV's API)
    // ...

    res.json({ mnemonic });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
