import fetch from 'node-fetch';

async function createValidator(withdrawalAddress, password) {
  const url = 'http://localhost:3001/api/create-validator';
  const body = JSON.stringify({ withdrawalAddress, password });

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: body,
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Validator created successfully:');
    console.log('Mnemonic:', data.mnemonic);
    console.log('Keystore Path:', data.keystorePath);
  } catch (error) {
    console.error('Error creating validator:', error.message);
  }
}

// Example usage
const withdrawalAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'; // Replace with a valid Ethereum address
const password = 'your_secure_password'; // Replace with a secure password

createValidator(withdrawalAddress, password);