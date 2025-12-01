#!/bin/bash

# Create a cleanup directory for backup
mkdir -p _cleanup_backup/api

# Move legacy API files to backup
echo "Moving legacy API files to backup..."

# Move archived files
if [ -d "src/api/archive-to-delete" ]; then
  mv src/api/archive-to-delete _cleanup_backup/api/
  echo "Moved archive-to-delete directory"
fi

if [ -d "src/api/archived" ]; then
  mv src/api/archived _cleanup_backup/api/
  echo "Moved archived directory"
fi

# Move duplicate implementations
files_to_move=(
  "src/api/apiClient.ts"
  "src/api/enhancedApiClient.ts"
  "src/api/api.ts"
  "src/api/eventApi.ts"
  "src/api/issuesApi.ts"
  "src/api/alertsApi.ts"
  "src/api/configApi.ts"
  "src/api/modelApi.ts"
)

for file in "${files_to_move[@]}"; do
  if [ -f "$file" ]; then
    mv "$file" "_cleanup_backup/api/$(basename $file)"
    echo "Moved $file"
  fi
done

echo "Cleanup complete! Old files backed up to _cleanup_backup/api/"
echo "You can safely delete _cleanup_backup once you verify everything works."