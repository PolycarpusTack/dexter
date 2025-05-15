#!/bin/bash
# Script to clean install dependencies and fix React version issues

echo "Cleaning node_modules and package-lock.json..."
rm -rf node_modules package-lock.json

echo "Installing exact versions of React..."
npm install react@18.2.0 react-dom@18.2.0 --save-exact

echo "Installing other dependencies..."
npm install

echo "Verifying React versions..."
npm ls react react-dom

echo "Installation complete! You can now run: npm run dev"