/**
 * SQL Formatting, DDL to TypeScript/Prisma Converter, and Mock INSERT Generator
 */

const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN',
  'FULL JOIN', 'JOIN', 'ON', 'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT', 'OFFSET',
  'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'CREATE TABLE',
  'ALTER TABLE', 'DROP TABLE', 'UNION ALL', 'UNION', 'AS', 'IN', 'NOT IN',
  'EXISTS', 'NOT EXISTS', 'LIKE', 'ILIKE', 'BETWEEN', 'IS NULL', 'IS NOT NULL',
  'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'ASC', 'DESC', 'DISTINCT'
];

export function formatSql(query: string): string {
  let cleaned = query.trim().replace(/\s+/g, ' ');

  // Standardize uppercase keywords
  const sortedKeywords = [...SQL_KEYWORDS].sort((a, b) => b.length - a.length);
  for (const kw of sortedKeywords) {
    const reg = new RegExp(`\\b${kw}\\b`, 'gi');
    cleaned = cleaned.replace(reg, kw);
  }

  // Insert line breaks before major clauses
  const majorClauses = [
    'SELECT', 'FROM', 'WHERE', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'FULL JOIN',
    'JOIN', 'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT', 'OFFSET', 'VALUES', 'SET'
  ];

  for (const clause of majorClauses) {
    const reg = new RegExp(`\\s+(${clause})\\b`, 'g');
    cleaned = cleaned.replace(reg, '\n$1');
  }

  // Break lines after commas in SELECT list, before next main keyword
  const lines = cleaned.split('\n');
  const formattedLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('AND ') || trimmed.startsWith('OR ') || trimmed.startsWith('ON ')) {
      formattedLines.push('  ' + trimmed);
    } else if (trimmed.startsWith('SELECT ')) {
      // Split selected columns
      const cols = trimmed.substring(7).split(/,(?![^(]*\))/);
      if (cols.length > 1) {
        formattedLines.push('SELECT');
        cols.forEach((col, idx) => {
          const isLast = idx === cols.length - 1;
          formattedLines.push(`  ${col.trim()}${isLast ? '' : ','}`);
        });
      } else {
        formattedLines.push(trimmed);
      }
    } else {
      formattedLines.push(trimmed);
    }
  }

  return formattedLines.join('\n');
}

// Convert CREATE TABLE DDL to TypeScript interface
export function ddlToTypeScript(ddl: string): string {
  const tableMatch = ddl.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:["`]?\w+["`]?\.)?["`]?(\w+)["`]?\s*\(([\s\S]+)\)/i);
  if (!tableMatch) {
    return '// Could not parse CREATE TABLE statement. Please provide standard SQL DDL syntax.';
  }

  const tableName = tableMatch[1];
  const body = tableMatch[2];

  const toPascalCase = (str: string) =>
    str.replace(/[-_](\w)/g, (_, c) => c.toUpperCase()).replace(/^\w/, (c) => c.toUpperCase());

  const lines = body.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('--'));
  const fields: { name: string; type: string; nullable: boolean }[] = [];

  for (const line of lines) {
    const cleanLine = line.replace(/,$/, '').trim();
    // Skip table constraints like PRIMARY KEY (...), CONSTRAINT ..., FOREIGN KEY ...
    if (/^(PRIMARY\s+KEY|FOREIGN\s+KEY|CONSTRAINT|UNIQUE|INDEX|CHECK)\b/i.test(cleanLine)) {
      continue;
    }

    const colMatch = cleanLine.match(/^["`]?([a-zA-Z0-9_]+)["`]?\s+([a-zA-Z0-9_()]+)(.*)/i);
    if (colMatch) {
      const colName = colMatch[1];
      const colType = colMatch[2].toUpperCase();
      const constraints = colMatch[3].toUpperCase();

      const nullable = !constraints.includes('NOT NULL') && !constraints.includes('PRIMARY KEY');
      let tsType = 'string';

      if (colType.includes('INT') || colType.includes('SERIAL') || colType.includes('NUMERIC') || colType.includes('DECIMAL') || colType.includes('FLOAT') || colType.includes('DOUBLE') || colType.includes('REAL')) {
        tsType = 'number';
      } else if (colType.includes('BOOL')) {
        tsType = 'boolean';
      } else if (colType.includes('JSON')) {
        tsType = 'Record<string, unknown>';
      } else if (colType.includes('DATE') || colType.includes('TIME')) {
        tsType = 'Date | string';
      } else if (colType.includes('UUID')) {
        tsType = 'string';
      }

      fields.push({ name: colName, type: tsType, nullable });
    }
  }

  const tsName = toPascalCase(tableName);
  const codeLines = [`export interface ${tsName} {`];
  for (const f of fields) {
    codeLines.push(`  ${f.name}${f.nullable ? '?' : ''}: ${f.type};`);
  }
  codeLines.push('}');

  return codeLines.join('\n');
}

// Generate Mock SQL INSERT Statements
export function generateMockSqlInserts(tableName: string = 'users', rowCount: number = 10): string {
  const firstNames = ['Somchai', 'Ploy', 'Nattawut', 'Kanya', 'Apinya', 'Thanakorn', 'Elena', 'Marcus', 'Chloe', 'David'];
  const lastNames = ['Prasert', 'Sukhumvit', 'Rattanakosin', 'Boonmee', 'Chaiyo', 'Kovacs', 'Vance', 'Chen', 'Lindqvist'];
  const domains = ['gmail.com', 'techcorp.io', 'bangkok.dev', 'acme.org', 'cloudinfra.co'];
  const roles = ['admin', 'engineer', 'analyst', 'manager', 'viewer'];

  const rows: string[] = [];
  const baseTime = Date.now() - 30 * 24 * 3600 * 1000;

  for (let i = 1; i <= rowCount; i++) {
    const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
    const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@${domains[i % domains.length]}`;
    const role = roles[i % roles.length];
    const score = Math.floor(Math.random() * 850) + 150;
    const isActive = Math.random() > 0.15 ? 'TRUE' : 'FALSE';
    const createdAt = new Date(baseTime + i * 3600 * 1000 * 24).toISOString();

    rows.push(`  (${i}, '${fn} ${ln}', '${email}', '${role}', ${score}, ${isActive}, '${createdAt}')`);
  }

  return `-- Seed data generated for ${tableName} (${rowCount} rows)\nINSERT INTO ${tableName} (\n  id, full_name, email, role, loyalty_points, is_active, created_at\n) VALUES\n${rows.join(',\n')};`;
}
