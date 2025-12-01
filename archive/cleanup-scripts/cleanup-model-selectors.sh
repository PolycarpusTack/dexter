#!/bin/bash

# Move legacy ModelSelector files to backup
mkdir -p _cleanup_backup/model-selectors

echo "Moving legacy ModelSelector files to backup..."

# Legacy files to move
files_to_move=(
  "src/components/ModelSelector/ModelSelector.jsx"
  "src/components/ModelSelector/ModelSelector.tsx"
  "src/components/ModelSelector/EnhancedModelSelector.tsx"
  "src/components/ModelSelector/EnhancedModelSelector.jsx"
  "Old_JS_Dexter/app/src/components/ModelSelector"
  "src/components/archive-to-delete/ModelSelector.jsx"
)

for file in "${files_to_move[@]}"; do
  if [ -e "$file" ]; then
    cp -r "$file" "_cleanup_backup/model-selectors/$(basename $file)"
    rm -rf "$file"
    echo "Moved $file"
  fi
done

echo "Cleanup complete! Old ModelSelector files backed up to _cleanup_backup/model-selectors/"
echo "The unified ModelSelector is now the only version."