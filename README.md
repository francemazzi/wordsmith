# wordsmith-ts

> 🧩 A lightweight functional Node.js library to extract and replace variables in Word (.docx) files with support for dynamic table generation.

[![npm version](https://img.shields.io/npm/v/wordsmith-ts.svg?style=flat-square)](https://www.npmjs.com/package/wordsmith-ts)
[![License](https://img.shields.io/npm/l/wordsmith-ts.svg?style=flat-square)](LICENSE)

---

## ✨ Features

- 📄 **Read and parse .docx files** - Works with file paths or buffers
- 🔍 **Extract variables** - Find all `{{variables}}` in your documents
- 🔁 **Replace dynamically** - Simple text and complex table variables
- 📊 **Dynamic tables** - Expand table rows from arrays
- 🎯 **Functional design** - Pure functions, composable, testable
- ⚡️ **TypeScript support** - Full type definitions included
- 🚀 **Zero configuration** - Works out of the box

---

## 🚀 Installation

```bash
npm install @frasma/wordsmith-ts
```

Or with other package managers:

```bash
yarn add @frasma/wordsmith-ts
pnpm add @frasma/wordsmith-ts
```

---

## 📖 Usage

### Basic Example

```javascript
import { extract, replace, process } from "@frasma/wordsmith-ts";

// Extract variables from a template
const result = await extract("./template.docx");
console.log(result.variables); // ['name', 'date', ...]
console.log(result.tableVariables); // { items: ['name', 'qty', 'price'] }

// Replace variables
const output = await replace("./template.docx", {
  name: "Mario Rossi",
  date: "2025-11-03",
  company: "Acme Corp",
});

// Save to file
import { writeFileSync } from "fs";
writeFileSync("./output.docx", output);

// Or use process() for one-step operation
await process("./template.docx", data, "./output.docx");
```

---

## 📝 Variable Syntax

### Simple Variables

Use double curly braces `{{variable}}` in your Word document:

```
Hello {{name}},

Your order #{{orderNumber}} dated {{date}} has been confirmed.
Total amount: {{total}} EUR
```

Then replace them:

```javascript
const data = {
  name: "Mario Rossi",
  orderNumber: "2025-001",
  date: "2025-11-03",
  total: "1,250.00",
};

await replace("./template.docx", data);
```

### Table Variables (Dynamic Rows)

Create a template row in your Word table with `{{arrayName.fieldName}}`:

```
┌────────────┬─────────┬────────┬─────────┐
│ Product    │ Qty     │ Price  │ Total   │
├────────────┼─────────┼────────┼─────────┤
│ {{items.name}}│{{items.qty}}│{{items.price}}│{{items.total}}│
└────────────┴─────────┴────────┴─────────┘
```

The library will:

1. Detect the template row
2. Clone it for each item in the array
3. Replace variables with actual values

```javascript
const data = {
  items: [
    { name: "Laptop", qty: 2, price: "1,200", total: "2,400" },
    { name: "Mouse", qty: 5, price: "25", total: "125" },
    { name: "Keyboard", qty: 3, price: "80", total: "240" },
  ],
};

await replace("./invoice.docx", data);
```

**Result:**

```
┌────────────┬─────────┬────────┬─────────┐
│ Product    │ Qty     │ Price  │ Total   │
├────────────┼─────────┼────────┼─────────┤
│ Laptop     │ 2       │ 1,200  │ 2,400   │
│ Mouse      │ 5       │ 25     │ 125     │
│ Keyboard   │ 3       │ 80     │ 240     │
└────────────┴─────────┴────────┴─────────┘
```

### Special Variables

- `{{arrayName.#}}` or `{{arrayName.index}}` - Row number (1, 2, 3...)

### Object Property Access

Access properties of single objects (not arrays):

```
Customer: {{user.name}}
Email: {{user.email}}
Address: {{address.street}}, {{address.city}} ({{address.country}})
```

**Data structure:**

```javascript
const data = {
  user: {
    name: "Mario Rossi",
    email: "mario@example.com",
  },
  address: {
    street: "Via Roma 123",
    city: "Milano",
    country: "Italia",
  },
};
```

**Note:** Use this for single objects. For arrays that need to expand into table rows, use the table variable syntax `{{arrayName.field}}` instead.

### Conditional Blocks

Use conditional logic to show/hide content based on variable values:

```
{{#if isApproved}}
✅ This document has been approved on {{approvalDate}} by {{approverName}}.
{{/if}}
```

Or with else block:

```
{{#if isApproved}}
✅ Document approved
{{else}}
⚠️ Pending approval
{{/if}}
```

**Supported in:** Paragraphs, tables, and any text content.

**Evaluation rules:**

- `true` / `false` → Boolean value
- Numbers → `0` is false, all others are true
- Strings → Empty string is false, all others are true
- Arrays → Empty array is false, all others are true
- `null` / `undefined` → false

**Example:**

```javascript
const data = {
  isApproved: true,
  approvalDate: "2025-11-03",
  approverName: "Dr. Marco Verdi",
  isPending: false,
};

await replace("./template.docx", data);
```

---

## 🔧 API Reference

### `extract(source)`

Extract all variables from a .docx file.

**Parameters:**

- `source: string | Buffer` - File path or Buffer

**Returns:** `Promise<ExtractResult>`

```typescript
type ExtractResult = {
  variables: string[]; // Simple variables
  tableVariables: Record<string, string[]>; // Table variables grouped by array name
  tables: Table[]; // Table metadata
};
```

**Example:**

```javascript
const result = await extract("./template.docx");

console.log(result.variables);
// ['name', 'date', 'total']

console.log(result.tableVariables);
// { items: ['name', 'qty', 'price', 'total'] }
```

---

### `replace(source, data)`

Replace variables in a .docx file.

**Parameters:**

- `source: string | Buffer` - File path or Buffer
- `data: Record<string, any>` - Variable values

**Returns:** `Promise<Buffer>` - Processed .docx file as Buffer

**Example:**

```javascript
const buffer = await replace("./template.docx", {
  name: "John Doe",
  items: [
    { product: "A", qty: 1 },
    { product: "B", qty: 2 },
  ],
});

// Save to file
writeFileSync("./output.docx", buffer);
```

---

### `process(source, data, outputPath)`

All-in-one function: read, replace, and save.

**Parameters:**

- `source: string | Buffer` - Input file path or Buffer
- `data: Record<string, any>` - Variable values
- `outputPath: string` - Output file path

**Returns:** `Promise<void>`

**Example:**

```javascript
await process(
  "./template.docx",
  { name: "Alice", date: "2025-11-03" },
  "./output.docx"
);
```

---

## 💡 Advanced Usage

### Working with Buffers

```javascript
import { readFile } from "fs/promises";

const buffer = await readFile("./template.docx");
const output = await replace(buffer, data);
```

### Functional Composition

```javascript
import { pipe } from "@frasma/wordsmith-ts/utils";

const processDocument = pipe(
  readTemplate,
  extractData,
  enrichData,
  replaceVariables
);
```

### Multiple Tables

You can have multiple dynamic tables in the same document:

```javascript
const data = {
  // First table
  products: [
    { name: "Product A", price: 100 },
    { name: "Product B", price: 200 },
  ],

  // Second table
  employees: [
    { name: "Mario", role: "Developer" },
    { name: "Luigi", role: "Designer" },
  ],
};
```

---

## 📋 Best Practices

### Creating Templates

✅ **DO:**

- Type variables all at once: `{{name}}`
- Use clear variable names: `{{orderDate}}`, `{{customerName}}`
- Test your template before production
- Keep table structures simple

❌ **DON'T:**

- Don't format part of a variable: `{{na`**`me`**`}}`
- Don't use spaces in names: `{{customer name}}`
- Don't copy/paste from external sources (may include hidden formatting)

### Data Preparation

```javascript
// Good: Prepare data before passing to wordsmith-ts
const data = {
  date: new Date().toLocaleDateString("it-IT"),
  total: formatCurrency(totalAmount),
  items: items.map((item) => ({
    name: item.name,
    qty: item.quantity,
    price: formatCurrency(item.price),
    total: formatCurrency(item.quantity * item.price),
  })),
};

await replace("./template.docx", data);
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Build the project
npm run build
```

---

## 🛠️ Development

```bash
# Clone the repository
git clone https://github.com/yourusername/wordsmith-ts.git

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Watch mode for development
npm run dev
```

---

## 📚 Examples

Check the `examples/` directory for more usage examples:

```bash
cd examples
node basic-usage.js
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

MIT © Francesco

---

## 🐛 Troubleshooting

### Variables not found

- Ensure variables use correct syntax: `{{variableName}}`
- Check for hidden formatting in Word (try retyping the variable)
- Variables are case-sensitive

### Tables not expanding

- Verify table variable syntax: `{{arrayName.fieldName}}`
- Ensure data is an array: `data.arrayName = [...]`
- Check that array name matches exactly

### File corruption

- Ensure input file is a valid .docx (not .doc)
- Don't manually edit the XML
- Keep backups of your templates

---

## 🔗 Links

- [npm package](https://www.npmjs.com/package/@frasma/wordsmith-ts)
- [GitHub repository](https://github.com/yourusername/wordsmith-ts)
- [Issue tracker](https://github.com/yourusername/wordsmith-ts/issues)

---

Made with ❤️ using functional programming principles
