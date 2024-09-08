#!/bin/bash


set -x


if [ "$#" -ne 3 ]; then
    echo "Usage: $0 <num_validators> <chain> <password>"
    exit 1
fi

NUM_VALIDATORS=$1
CHAIN=$2
PASSWORD=$3

echo "Starting validator key generation process..."
echo "Number of validators: $NUM_VALIDATORS"
echo "Chain: $CHAIN"
echo "Password: [REDACTED]"

echo "Running deposit CLI..."
output=$(./deposit new-mnemonic --num_validators $NUM_VALIDATORS --chain $CHAIN <<EOF
3
4
$PASSWORD
$PASSWORD


EOF
)

echo "Deposit CLI execution completed."


echo "Extracting mnemonic and keystore path..."
mnemonic=$(echo "$output" | grep -A1 "This is your mnemonic" | tail -n1)
keystore_path=$(echo "$output" | grep "Your keys can be found at:" | awk -F': ' '{print $2}')

echo "Raw output:"
echo "$output"

echo "{ \"mnemonic\": \"$mnemonic\", \"keystorePath\": \"$keystore_path\" }"

echo "Script execution completed."