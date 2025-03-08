/**
 * Type definitions for template files
 */

// Define interface for the template files structure
export interface TemplateFile {
  file: {
    contents: string;
  };
}

export interface TemplateFiles {
  [path: string]: TemplateFile;
}
