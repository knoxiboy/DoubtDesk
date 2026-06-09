const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory() && !file.includes('node_modules') && !file.includes('.git')) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('src');
for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('process.env.GROQ_API_KEY') && !content.includes("|| 'dummy_key'") && !content.includes('|| "dummy_key"')) {
        console.log(`Fixing ${file}`);
        content = content.replace(/process\.env\.GROQ_API_KEY/g, "process.env.GROQ_API_KEY || 'dummy_key'");
        fs.writeFileSync(file, content);
    }
}
