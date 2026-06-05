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
    if (content.includes('new Groq')) {
        console.log(`new Groq in ${file}`);
        // print the lines containing new Groq
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('new Groq')) {
                console.log(`  ${lines[i]}`);
                if (lines[i+1]) console.log(`  ${lines[i+1]}`);
                if (lines[i+2]) console.log(`  ${lines[i+2]}`);
            }
        }
    }
}
