export type TestRunner = 'vitest' | 'jest';

export interface ParsedProp {
  name: string;
  type: string;
  optional: boolean;
  isCallback: boolean;
}

export interface ParsedFunction {
  name: string;
  params: { name: string; type: string }[];
  isAsync: boolean;
  returnType: string;
}

export interface ParsedStructure {
  kind: 'react-component' | 'typescript-module' | 'empty';
  componentName: string | null;
  propsInterfaceName: string | null;
  props: ParsedProp[];
  functions: ParsedFunction[];
  detectedElements: {
    buttons: string[];
    inputs: string[];
    roles: string[];
    hasForm: boolean;
  };
}

export interface TestGenOptions {
  runner: TestRunner;
  useUserEvent: boolean;
  includeMockFactory: boolean;
  includeEdgeCases: boolean;
  includeA11yQueries: boolean;
  importPath: string;
}

function splitTopLevelProps(body: string): string[] {
  const lines = body.split(/\r?\n|;/);
  const results: string[] = [];
  let buffer = '';
  let depth = 0;

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      continue;
    }
    buffer += (buffer ? ' ' : '') + trimmed;
    for (const ch of trimmed) {
      if (ch === '{' || ch === '(' || ch === '<' || ch === '[') depth++;
      if (ch === '}' || ch === ')' || ch === '>' || ch === ']') depth = Math.max(0, depth - 1);
    }
    if (depth === 0 && buffer) {
      results.push(buffer);
      buffer = '';
    }
  }
  if (buffer) results.push(buffer);
  return results;
}

export function parseCodeStructure(raw: string): ParsedStructure {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      kind: 'empty',
      componentName: null,
      propsInterfaceName: null,
      props: [],
      functions: [],
      detectedElements: { buttons: [], inputs: [], roles: [], hasForm: false },
    };
  }

  // 1. Detect Component Name
  let componentName: string | null = null;
  const fcMatch = trimmed.match(/(?:export\s+(?:default\s+)?)?(?:const|let)\s+([A-Z][A-Za-z0-9_]*)\s*:\s*(?:React\.)?(?:FC|FunctionComponent)\s*<([A-Za-z0-9_]+)>/);
  const fnCompMatch = trimmed.match(/(?:export\s+(?:default\s+)?)?function\s+([A-Z][A-Za-z0-9_]*)\s*\(/);
  const arrowCompMatch = trimmed.match(/(?:export\s+)?const\s+([A-Z][A-Za-z0-9_]*)\s*=\s*(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>/);

  if (fcMatch) componentName = fcMatch[1];
  else if (fnCompMatch) componentName = fnCompMatch[1];
  else if (arrowCompMatch && (trimmed.includes('return (') || trimmed.includes('<'))) {
    componentName = arrowCompMatch[1];
  }

  // 2. Parse Interfaces or Type aliases for Props
  let propsInterfaceName: string | null = fcMatch ? fcMatch[2] : null;
  const props: ParsedProp[] = [];

  const interfaceRegex = /(?:export\s+)?(?:interface\s+([A-Za-z0-9_]+)\s*(?:extends\s+[^{]+)?|type\s+([A-Za-z0-9_]+)\s*=\s*)\{([\s\S]*?)\n\s*\}/g;
  let ifaceMatch: RegExpExecArray | null;
  while ((ifaceMatch = interfaceRegex.exec(trimmed)) !== null) {
    const ifaceName = ifaceMatch[1] || ifaceMatch[2];
    const body = ifaceMatch[3];
    if (!propsInterfaceName || ifaceName.endsWith('Props')) {
      propsInterfaceName = ifaceName;
      if (!componentName && ifaceName.endsWith('Props')) {
        componentName = ifaceName.replace(/Props$/, '');
      }
      props.length = 0; // prefer explicit *Props interface
      const entries = splitTopLevelProps(body);
      for (const entry of entries) {
        const m = entry.match(/^([A-Za-z0-9_]+)(\?)?\s*:\s*(.+)$/);
        if (m) {
          const propName = m[1];
          const optional = Boolean(m[2]);
          const propType = m[3].replace(/;$/, '').trim();
          const isCallback =
            propType.includes('=>') ||
            /^on[A-Z]/.test(propName) ||
            propType.includes('VoidFunction') ||
            propType.includes('Function');
          props.push({ name: propName, type: propType, optional, isCallback });
        }
      }
    }
  }

  // 3. Parse exported functions (non-PascalCase utility functions)
  const functions: ParsedFunction[] = [];
  const fnRegex = /export\s+(async\s+)?function\s+([a-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?/g;
  let fnMatch: RegExpExecArray | null;
  while ((fnMatch = fnRegex.exec(trimmed)) !== null) {
    const isAsync = Boolean(fnMatch[1]);
    const name = fnMatch[2];
    const rawParams = fnMatch[3].trim();
    const returnType = (fnMatch[4] || 'unknown').trim();
    const params = rawParams
      ? rawParams.split(',').map((p) => {
          const [pName, pType] = p.split(':').map((s) => s.trim());
          return {
            name: (pName || 'arg').replace(/\?$/, ''),
            type: pType || 'unknown',
          };
        })
      : [];
    functions.push({ name, params, isAsync, returnType });
  }

  const arrowFnRegex = /export\s+const\s+([a-z_][A-Za-z0-9_]*)\s*=\s*(async\s+)?\(([^)]*)\)(?:\s*:\s*([^=]+))?\s*=>/g;
  let afMatch: RegExpExecArray | null;
  while ((afMatch = arrowFnRegex.exec(trimmed)) !== null) {
    const name = afMatch[1];
    const isAsync = Boolean(afMatch[2]);
    const rawParams = afMatch[3].trim();
    const returnType = (afMatch[4] || 'unknown').trim();
    const params = rawParams
      ? rawParams.split(',').map((p) => {
          const [pName, pType] = p.split(':').map((s) => s.trim());
          return {
            name: (pName || 'arg').replace(/\?$/, ''),
            type: pType || 'unknown',
          };
        })
      : [];
    functions.push({ name, params, isAsync, returnType });
  }

  // 4. Detect JSX elements for RTL queries
  const buttons: string[] = [];
  const btnRegex = /<button[^>]*>([^<{]{1,40})<\/button>/gi;
  let btnM: RegExpExecArray | null;
  while ((btnM = btnRegex.exec(trimmed)) !== null) {
    const label = btnM[1].trim();
    if (label) buttons.push(label);
  }

  const inputs: string[] = [];
  const placeholderRegex = /placeholder=["']([^"']+)["']/gi;
  let phM: RegExpExecArray | null;
  while ((phM = placeholderRegex.exec(trimmed)) !== null) {
    inputs.push(phM[1]);
  }

  const roles: string[] = [];
  const roleRegex = /role=["']([^"']+)["']/gi;
  let rlM: RegExpExecArray | null;
  while ((rlM = roleRegex.exec(trimmed)) !== null) {
    roles.push(rlM[1]);
  }

  const hasForm = /<form\b/i.test(trimmed) || /onSubmit/i.test(trimmed);
  const isReact =
    Boolean(componentName) ||
    Boolean(propsInterfaceName) ||
    trimmed.includes('React') ||
    /<[A-Za-z]+[\s>]/.test(trimmed);

  return {
    kind: isReact ? 'react-component' : 'typescript-module',
    componentName: componentName || (isReact ? 'TargetComponent' : null),
    propsInterfaceName,
    props,
    functions,
    detectedElements: { buttons, inputs, roles, hasForm },
  };
}

function mockValueForType(prop: ParsedProp, mockFnName: string): string {
  if (prop.isCallback) return `${mockFnName}()`;
  const t = prop.type.toLowerCase();

  // String union literal like 'primary' | 'secondary'
  const literalMatch = prop.type.match(/^['"]([^'"]+)['"]\s*\|/);
  if (literalMatch) return `'${literalMatch[1]}'`;

  if (t === 'string') {
    if (prop.name.toLowerCase().includes('email')) return `'user@example.com'`;
    if (prop.name.toLowerCase().includes('url')) return `'https://example.com'`;
    if (prop.name.toLowerCase().includes('id')) return `'id-123'`;
    if (prop.name.toLowerCase().includes('title')) return `'Sample Title'`;
    return `'sample-${prop.name}'`;
  }
  if (t === 'number') return '42';
  if (t === 'boolean') {
    if (prop.name.toLowerCase().includes('loading') || prop.name.toLowerCase().includes('disabled')) {
      return 'false';
    }
    return 'true';
  }
  if (t.endsWith('[]') || t.startsWith('array<')) return '[]';
  if (t.includes('reactnode') || t.includes('jsx.element')) return `'Mock Content'`;
  if (t.includes('date')) return 'new Date("2026-01-01T00:00:00Z")';
  return '{} as any';
}

export function generateTestSuite(parsed: ParsedStructure, opts: TestGenOptions): { code: string; testCount: number } {
  if (parsed.kind === 'empty') {
    return {
      code: '// Paste a React component, TypeScript interface, or utility module to generate tests.',
      testCount: 0,
    };
  }

  const mockFn = opts.runner === 'vitest' ? 'vi.fn' : 'jest.fn';
  const clearMocks = opts.runner === 'vitest' ? 'vi.clearAllMocks()' : 'jest.clearAllMocks()';
  let testCount = 0;

  if (parsed.kind === 'typescript-module' && parsed.functions.length > 0) {
    const fnNames = parsed.functions.map((f) => f.name).join(', ');
    const lines: string[] = [];

    if (opts.runner === 'vitest') {
      lines.push(`import { describe, it, expect, vi, beforeEach } from 'vitest';`);
    } else {
      lines.push(`import { describe, it, expect, jest, beforeEach } from '@jest/globals';`);
    }
    lines.push(`import { ${fnNames} } from '${opts.importPath || './module'}';`, '');

    lines.push(`describe('${parsed.functions[0].name} & Module Utilities', () => {`);
    lines.push(`  beforeEach(() => {\n    ${clearMocks};\n  });\n`);

    for (const fn of parsed.functions) {
      const sampleArgs = fn.params
        .map((p) =>
          mockValueForType(
            { name: p.name, type: p.type, optional: false, isCallback: p.type.includes('=>') },
            mockFn
          )
        )
        .join(', ');

      testCount++;
      lines.push(
        `  it('executes ${fn.name}() with valid inputs', ${fn.isAsync ? 'async ' : ''}() => {`
      );
      if (fn.isAsync) {
        lines.push(`    const result = await ${fn.name}(${sampleArgs});`);
      } else {
        lines.push(`    const result = ${fn.name}(${sampleArgs});`);
      }
      lines.push(`    expect(result).toBeDefined();`);
      lines.push(`  });\n`);

      if (opts.includeEdgeCases) {
        testCount++;
        lines.push(
          `  it('handles edge-case inputs safely in ${fn.name}()', ${fn.isAsync ? 'async ' : ''}() => {`
        );
        if (fn.isAsync) {
          lines.push(`    await expect(${fn.name}(${sampleArgs})).resolves.not.toThrow();`);
        } else {
          lines.push(`    expect(() => ${fn.name}(${sampleArgs})).not.toThrow();`);
        }
        lines.push(`  });\n`);
      }
    }

    lines.push(`});`);
    return { code: lines.join('\n'), testCount };
  }

  // React Component / Props Interface Suite
  const comp = parsed.componentName || 'Component';
  const propsType = parsed.propsInterfaceName;
  const lines: string[] = [];

  if (opts.runner === 'vitest') {
    lines.push(`import { describe, it, expect, vi, beforeEach } from 'vitest';`);
  } else {
    lines.push(`import { describe, it, expect, jest, beforeEach } from '@jest/globals';`);
  }

  const rtlImports = ['render', 'screen'];
  if (parsed.props.some((p) => p.type.toLowerCase().includes('promise'))) {
    rtlImports.push('waitFor');
  }
  lines.push(`import { ${rtlImports.join(', ')} } from '@testing-library/react';`);
  if (opts.useUserEvent) {
    lines.push(`import userEvent from '@testing-library/user-event';`);
  }

  const importItems = [comp];
  if (propsType) importItems.push(`type ${propsType}`);
  lines.push(`import { ${importItems.join(', ')} } from '${opts.importPath || `./${comp}`}';`, '');

  // Mock factory
  if (opts.includeMockFactory && parsed.props.length > 0) {
    const typeAnnotation = propsType ? `: ${propsType}` : '';
    const paramType = propsType ? `: Partial<${propsType}> = {}` : ': Record<string, any> = {}';
    lines.push(`const createMockProps = (overrides${paramType})${typeAnnotation} => ({`);
    for (const prop of parsed.props) {
      lines.push(`  ${prop.name}: ${mockValueForType(prop, mockFn)},`);
    }
    lines.push(`  ...overrides,`, `});`, '');
  }

  lines.push(`describe('<${comp} />', () => {`);
  lines.push(`  beforeEach(() => {\n    ${clearMocks};\n  });\n`);

  // Test 1: Render baseline
  testCount++;
  const propsSpread =
    opts.includeMockFactory && parsed.props.length > 0
      ? ' {...createMockProps()}'
      : parsed.props.length > 0
      ? ` ${parsed.props.map((p) => `${p.name}={${mockValueForType(p, mockFn)}}`).join(' ')}`
      : '';

  lines.push(`  it('renders without crashing with default props', () => {`);
  if (opts.includeMockFactory && parsed.props.length > 0) {
    lines.push(`    const props = createMockProps();`);
    lines.push(`    render(<${comp} {...props} />);`);
  } else {
    lines.push(`    render(<${comp}${propsSpread} />);`);
  }

  if (opts.includeA11yQueries) {
    if (parsed.detectedElements.buttons.length > 0) {
      const btnName = parsed.detectedElements.buttons[0];
      lines.push(`    expect(screen.getByRole('button', { name: /${btnName}/i })).toBeInTheDocument();`);
    } else if (parsed.detectedElements.roles.length > 0) {
      lines.push(`    expect(screen.getByRole('${parsed.detectedElements.roles[0]}')).toBeInTheDocument();`);
    }
    if (parsed.detectedElements.inputs.length > 0) {
      lines.push(`    expect(screen.getByPlaceholderText('${parsed.detectedElements.inputs[0]}')).toBeInTheDocument();`);
    }
  }
  if (!opts.includeA11yQueries || (parsed.detectedElements.buttons.length === 0 && parsed.detectedElements.inputs.length === 0 && parsed.detectedElements.roles.length === 0)) {
    const stringProp = parsed.props.find((p) => p.type.toLowerCase() === 'string' && !p.optional);
    if (stringProp && opts.includeMockFactory) {
      lines.push(`    expect(screen.getByText(new RegExp(String(props.${stringProp.name}), 'i'))).toBeInTheDocument();`);
    } else if (stringProp) {
      lines.push(`    expect(screen.getByText(new RegExp(${mockValueForType(stringProp, mockFn)}, 'i'))).toBeInTheDocument();`);
    } else {
      lines.push(`    expect(document.body).toBeTruthy();`);
    }
  }
  lines.push(`  });\n`);

  // Test 2: Callback / Interaction tests
  const callbacks = parsed.props.filter((p) => p.isCallback);
  if (callbacks.length > 0) {
    const primaryCb = callbacks[0];
    testCount++;
    lines.push(`  it('invokes ${primaryCb.name} when triggered by user interaction', async () => {`);
    if (opts.useUserEvent) {
      lines.push(`    const user = userEvent.setup();`);
    }
    lines.push(`    const ${primaryCb.name} = ${mockFn}();`);
    if (opts.includeMockFactory && parsed.props.length > 0) {
      lines.push(`    render(<${comp} {...createMockProps({ ${primaryCb.name} })} />);`);
    } else {
      lines.push(`    render(<${comp}${propsSpread} ${primaryCb.name}={${primaryCb.name}} />);`);
    }

    if (opts.useUserEvent && parsed.detectedElements.inputs.length > 0) {
      parsed.detectedElements.inputs.slice(0, 2).forEach((ph) => {
        const val = /email/i.test(ph) ? 'dev@example.com' : 'test-input';
        lines.push(`    await user.type(screen.getByPlaceholderText('${ph}'), '${val}');`);
      });
    }

    if (opts.useUserEvent && parsed.detectedElements.buttons.length > 0) {
      lines.push(`    await user.click(screen.getByRole('button', { name: /${parsed.detectedElements.buttons[0]}/i }));`);
    } else if (opts.useUserEvent) {
      lines.push(`    const buttons = screen.queryAllByRole('button');`);
      lines.push(`    if (buttons.length > 0) await user.click(buttons[0]);`);
    }
    lines.push(`    expect(${primaryCb.name}).toHaveBeenCalledTimes(1);`);
    lines.push(`  });\n`);
  }

  // Test 3: Boolean state flags (loading, disabled, error)
  if (opts.includeEdgeCases) {
    const boolFlags = parsed.props.filter((p) => p.type.toLowerCase() === 'boolean');
    for (const flag of boolFlags.slice(0, 2)) {
      testCount++;
      lines.push(`  it('handles ${flag.name}=true state correctly', () => {`);
      if (opts.includeMockFactory && parsed.props.length > 0) {
        lines.push(`    render(<${comp} {...createMockProps({ ${flag.name}: true })} />);`);
      } else {
        lines.push(`    render(<${comp}${propsSpread} ${flag.name}={true} />);`);
      }
      if (/loading|disabled/i.test(flag.name) && parsed.detectedElements.buttons.length > 0) {
        lines.push(`    expect(screen.getByRole('button', { name: /${parsed.detectedElements.buttons[0]}/i })).toBeDisabled();`);
      } else {
        lines.push(`    expect(document.body).toBeTruthy();`);
      }
      lines.push(`  });\n`);
    }

    const errorProp = parsed.props.find((p) => /error/i.test(p.name));
    if (errorProp) {
      testCount++;
      lines.push(`  it('renders validation or API error message when ${errorProp.name} is provided', () => {`);
      const errVal = errorProp.type.toLowerCase() === 'string' ? `'Request failed'` : 'true';
      if (opts.includeMockFactory && parsed.props.length > 0) {
        lines.push(`    render(<${comp} {...createMockProps({ ${errorProp.name}: ${errVal} })} />);`);
      } else {
        lines.push(`    render(<${comp}${propsSpread} ${errorProp.name}={${errVal}} />);`);
      }
      if (errorProp.type.toLowerCase() === 'string') {
        lines.push(`    expect(screen.getByText(/Request failed/i)).toBeInTheDocument();`);
      } else {
        lines.push(`    expect(screen.getByRole('alert')).toBeInTheDocument();`);
      }
      lines.push(`  });\n`);
    }
  }

  lines.push(`});`);
  return { code: lines.join('\n'), testCount };
}
