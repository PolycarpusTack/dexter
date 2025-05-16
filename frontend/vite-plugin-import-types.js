/**
 * Vite plugin to handle TypeScript module imports without extensions
 */
function importTypesPlugin() {
  return {
    name: 'vite-plugin-import-types',
    resolveId(id, importer) {
      // If we're importing a .ts file but not specifying the extension,
      // make sure to resolve it correctly
      if (id.startsWith('.') && !id.endsWith('.ts') && !id.endsWith('.js')) {
        // Try to resolve with .ts extension
        const tsPath = `${id}.ts`;
        try {
          const resolved = this.resolve(tsPath, importer);
          if (resolved) {
            return resolved;
          }
        } catch (e) {
          // Continue if not found
        }
      }
      return null;
    },
    // Fix: Return null instead of trying to manipulate the content
    load(id) {
      return null; // Let Vite handle the loading
    },
    // Use transform hook instead to set headers
    transformIndexHtml(html) {
      // Add a meta tag to ensure the correct content type
      return html.replace(
        /<head>/i, 
        `<head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <meta http-equiv="X-Content-Type-Options" content="nosniff" />`
      );
    }
  };
}

export default importTypesPlugin;
