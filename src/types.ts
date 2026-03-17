export type Variable = {
  name: string;
  pattern: string;
  isTableVariable: boolean;
  arrayName?: string;
  fieldName?: string;
};

export type TableCell = {
  text: string;
  variables: Variable[];
};

export type TableRow = {
  cells: TableCell[];
  isTemplate: boolean;
};

export type Table = {
  rows: TableRow[];
  hasTemplateRow: boolean;
  templateRowIndex?: number;
};

export type ExtractResult = {
  variables: string[];
  tableVariables: Record<string, string[]>;
  tables: Table[];
};

export type QuestionnaireAnswers = Record<
  string,
  string | number | boolean | Array<string | number | boolean>
>;

export type ReplaceData = Record<string, any> & {
  q?: QuestionnaireAnswers;
};

export type TransposedTableInfo = {
  transposed: boolean;
  arrayName?: string;
  templateColumnIndex?: number;
};

export type DocxFiles = Record<string, string>;
