import fs from "fs";
import path from "path";

// Directory to scan (your src folder)
const srcDir = path.resolve("./backend/src");

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath);
    } else if (file.endsWith(".ts")) {
      fixFile(fullPath);
    }
  }
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");

  // Regex to match relative imports without extensions
  content = content.replace(/from\s+['"](\..*?)['"]/g, (match, p1) => {
    // Skip if already ends with .js, .ts, or .json
    if (p1.endsWith(".js") || p1.endsWith(".ts") || p1.endsWith(".json"))
      return match;
    return `from '${p1}.js'`;
  });

  fs.writeFileSync(filePath, content, "utf8");
  console.log(`Fixed imports in: ${filePath}`);
}

walk(srcDir);
console.log("All imports fixed!");
