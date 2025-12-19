import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PdfConfig } from '@/lib/pdf/pdfUtils';

export interface DocumentTemplate {
  id: string;
  name: string;
  entity_type: 'invoice' | 'contract' | 'quote';
  content: string;
  variables: string[] | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Hook to get the default template for a given entity type
 */
export function useDefaultTemplate(entityType: 'invoice' | 'contract' | 'quote') {
  return useQuery({
    queryKey: ['default-template', entityType],
    queryFn: async () => {
      // First try to get the default template
      const { data: defaultTemplate, error: defaultError } = await supabase
        .from('document_templates')
        .select('*')
        .eq('entity_type', entityType)
        .eq('is_default', true)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (defaultTemplate && !defaultError) {
        return {
          id: defaultTemplate.id,
          name: defaultTemplate.name,
          entity_type: defaultTemplate.entity_type as 'invoice' | 'contract' | 'quote',
          content: defaultTemplate.content,
          variables: Array.isArray(defaultTemplate.variables) 
            ? (defaultTemplate.variables as string[]) 
            : null,
          is_default: defaultTemplate.is_default ?? false,
          is_active: defaultTemplate.is_active ?? true,
          created_at: defaultTemplate.created_at ?? '',
          updated_at: defaultTemplate.updated_at ?? '',
        } as DocumentTemplate;
      }

      // If no default, get the first active template
      const { data: firstTemplate, error: firstError } = await supabase
        .from('document_templates')
        .select('*')
        .eq('entity_type', entityType)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (firstTemplate && !firstError) {
        return {
          id: firstTemplate.id,
          name: firstTemplate.name,
          entity_type: firstTemplate.entity_type as 'invoice' | 'contract' | 'quote',
          content: firstTemplate.content,
          variables: Array.isArray(firstTemplate.variables) 
            ? (firstTemplate.variables as string[]) 
            : null,
          is_default: firstTemplate.is_default ?? false,
          is_active: firstTemplate.is_active ?? true,
          created_at: firstTemplate.created_at ?? '',
          updated_at: firstTemplate.updated_at ?? '',
        } as DocumentTemplate;
      }

      return null;
    },
    enabled: !!entityType,
  });
}

/**
 * Parse PDF_CONFIG comment from HTML template
 * Format: <!-- PDF_CONFIG: {"primary_color":"#4f46e5","secondary_color":"#666666"} -->
 */
function parsePdfConfigComment(content: string): Partial<PdfConfig> | null {
  // Use a non-greedy match so JSON can contain nested objects/arrays (e.g. footer_legal_lines)
  const match = content.match(/<!--\s*PDF_CONFIG:\s*([\s\S]*?)\s*-->/);
  if (!match) return null;

  try {
    return JSON.parse(match[1]);
  } catch {
    console.warn('Failed to parse PDF_CONFIG comment');
    return null;
  }
}

/**
 * Extract colors from inline styles in HTML
 * Searches for color patterns in various contexts
 */
function extractColorsFromInlineStyles(content: string): { primaryColor: string | null; secondaryColor: string | null } {
  let primaryColor: string | null = null;
  let secondaryColor: string | null = null;
  
  // Patterns to extract colors (in priority order)
  const colorPatterns = [
    // 1. Look for h1 color (usually primary)
    /<h1[^>]*style="[^"]*color:\s*(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})/i,
    // 2. Look for FACTURA/PRESUPUESTO/CONTRATO title color
    />(FACTURA|PRESUPUESTO|CONTRATO)<[^>]*style="[^"]*color:\s*(#[0-9a-fA-F]{6})/i,
    // 3. Look for background in thead/th (table headers)
    /<t[hr][^>]*style="[^"]*background(?:-color)?:\s*(#[0-9a-fA-F]{6})/i,
    // 4. Look for CSS variable definitions
    /--primary-color:\s*(#[0-9a-fA-F]{6})/i,
    // 5. Direct color in styles with "primary" class or id
    /\.primary[^{]*\{[^}]*color:\s*(#[0-9a-fA-F]{6})/i,
    // 6. Any prominent color definition
    /style="[^"]*color:\s*(#[0-9a-fA-F]{6})[^"]*font-size:\s*(?:2[4-9]|[3-9]\d)px/i,
  ];
  
  // Try to find primary color
  for (const pattern of colorPatterns) {
    const match = content.match(pattern);
    if (match) {
      // Pattern might capture color in different groups
      primaryColor = match[2] || match[1];
      if (primaryColor && primaryColor.startsWith('#')) {
        break;
      }
    }
  }
  
  // Patterns for secondary color
  const secondaryPatterns = [
    /--secondary-color:\s*(#[0-9a-fA-F]{6})/i,
    /<span[^>]*style="[^"]*color:\s*(#[0-9a-fA-F]{6})[^"]*font-size:\s*1[0-3]px/i,
    /color:\s*(#6[0-9a-fA-F]{5})/i, // Grayish colors often start with #6
  ];
  
  for (const pattern of secondaryPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      secondaryColor = match[1];
      break;
    }
  }
  
  return { primaryColor, secondaryColor };
}

/**
 * Extract primary and secondary colors from HTML template content
 * Supports multiple formats:
 * 1. PDF_CONFIG comment: <!-- PDF_CONFIG: {"primary_color":"#4f46e5"} -->
 * 2. CSS custom properties: --primary-color: #4f46e5;
 * 3. Inline styles in title/header elements
 * 4. data-attributes: data-primary-color="#4f46e5"
 */
export function extractColorsFromTemplate(content: string): { primaryColor: string; secondaryColor: string } {
  // Default colors
  let primaryColor = '#3366cc';
  let secondaryColor = '#666666';

  if (!content) {
    return { primaryColor, secondaryColor };
  }

  // 1. First priority: PDF_CONFIG comment (most reliable)
  const pdfConfig = parsePdfConfigComment(content);
  if (pdfConfig) {
    if (pdfConfig.primary_color) primaryColor = pdfConfig.primary_color;
    if (pdfConfig.secondary_color) secondaryColor = pdfConfig.secondary_color;
    console.log('[extractColorsFromTemplate] Found PDF_CONFIG:', { primaryColor, secondaryColor });
    return { primaryColor, secondaryColor };
  }

  // 2. Second priority: data attributes
  const primaryDataAttr = content.match(/data-primary-color="(#[0-9a-fA-F]{6})"/i);
  const secondaryDataAttr = content.match(/data-secondary-color="(#[0-9a-fA-F]{6})"/i);
  if (primaryDataAttr) {
    primaryColor = primaryDataAttr[1];
    if (secondaryDataAttr) secondaryColor = secondaryDataAttr[1];
    console.log('[extractColorsFromTemplate] Found data attributes:', { primaryColor, secondaryColor });
    return { primaryColor, secondaryColor };
  }

  // 3. Third priority: CSS custom properties
  const cssVarPrimary = content.match(/--primary-color:\s*(#[0-9a-fA-F]{6})/i);
  const cssVarSecondary = content.match(/--secondary-color:\s*(#[0-9a-fA-F]{6})/i);
  if (cssVarPrimary) {
    primaryColor = cssVarPrimary[1];
    if (cssVarSecondary) secondaryColor = cssVarSecondary[1];
    console.log('[extractColorsFromTemplate] Found CSS variables:', { primaryColor, secondaryColor });
    return { primaryColor, secondaryColor };
  }

  // 4. Fourth priority: Extract from inline styles
  const inlineColors = extractColorsFromInlineStyles(content);
  if (inlineColors.primaryColor) {
    primaryColor = inlineColors.primaryColor;
    if (inlineColors.secondaryColor) secondaryColor = inlineColors.secondaryColor;
    console.log('[extractColorsFromTemplate] Found inline styles:', { primaryColor, secondaryColor });
    return { primaryColor, secondaryColor };
  }

  // 5. Fallback: Look for any hex color that could be primary (in titles, backgrounds)
  const anyBackgroundColor = content.match(/background(?:-color)?:\s*(#[0-9a-fA-F]{6})/);
  if (anyBackgroundColor && anyBackgroundColor[1] !== '#f8f9fa' && anyBackgroundColor[1] !== '#ffffff') {
    primaryColor = anyBackgroundColor[1];
    console.log('[extractColorsFromTemplate] Fallback to background color:', primaryColor);
  }

  console.log('[extractColorsFromTemplate] Final colors:', { primaryColor, secondaryColor });
  return { primaryColor, secondaryColor };
}

/**
 * Extract full PdfConfig from template content
 * This analyzes the HTML template and extracts all configuration values for pdf-lib
 */
export function extractPdfConfigFromTemplate(template: DocumentTemplate | null): PdfConfig {
  const defaultConfig: PdfConfig = {
    primary_color: '#3366cc',
    secondary_color: '#666666',
    accent_color: '#0066cc',
    show_logo: true,
    logo_position: 'left',
    show_iban_footer: true,
    show_notes: true,
    show_discounts_column: true,
    header_style: 'classic',
    font_size_base: 10,
  };

  if (!template || !template.content) {
    console.log('[extractPdfConfigFromTemplate] No template, using defaults');
    return defaultConfig;
  }

  const content = template.content;

  // 1. First try PDF_CONFIG comment (highest priority)
  const pdfConfig = parsePdfConfigComment(content);
  if (pdfConfig) {
    console.log('[extractPdfConfigFromTemplate] Using PDF_CONFIG from template:', template.name, pdfConfig);
    return {
      ...defaultConfig,
      ...pdfConfig,
    };
  }

  // 2. Extract colors from HTML content
  const { primaryColor, secondaryColor } = extractColorsFromTemplate(content);

  // 3. Check for accent color
  const accentMatch = content.match(/--accent-color:\s*([^;]+)/i);
  const accentColor = accentMatch ? accentMatch[1].trim() : primaryColor;

  // 4. Check for logo visibility
  const showLogo = !content.includes('logo-hidden') && 
                   !content.match(/company_logo[^>]*display:\s*none/) && 
                   content.includes('{{company_logo}}');

  // 5. Check for logo position
  let logoPosition: 'left' | 'center' | 'right' = 'left';
  if (content.includes('logo-center') || content.match(/company_logo[^}]*text-align:\s*center/)) {
    logoPosition = 'center';
  } else if (content.includes('logo-right') || content.match(/company_logo[^}]*float:\s*right/)) {
    logoPosition = 'right';
  }

  // 6. Check for IBAN footer
  const showIbanFooter = content.includes('{{company_iban}}') || content.toLowerCase().includes('iban');

  // 7. Check for notes section
  const showNotes = content.includes('{{notes}}') || content.toLowerCase().includes('observaciones');

  // 8. Check for discounts column
  const showDiscountsColumn = content.includes('{{discount') || content.toLowerCase().includes('descuento');

  // 9. Check header style
  let headerStyle: 'classic' | 'modern' | 'minimal' = 'classic';
  if (content.includes('header-modern') || content.includes('modern')) {
    headerStyle = 'modern';
  } else if (content.includes('header-minimal') || content.includes('minimal')) {
    headerStyle = 'minimal';
  }

  // 10. Check font size
  const fontSizeMatch = content.match(/font-size:\s*(\d+)px/);
  const fontSizeBase = fontSizeMatch ? parseInt(fontSizeMatch[1], 10) : 10;

  const config: PdfConfig = {
    primary_color: primaryColor,
    secondary_color: secondaryColor,
    accent_color: accentColor,
    show_logo: showLogo,
    logo_position: logoPosition,
    show_iban_footer: showIbanFooter,
    show_notes: showNotes,
    show_discounts_column: showDiscountsColumn,
    header_style: headerStyle,
    font_size_base: fontSizeBase,
  };

  console.log('[extractPdfConfigFromTemplate] Extracted config from template:', template.name, config);
  return config;
}

/**
 * Generate PDF_CONFIG comment to embed in HTML template
 * This should be called when saving a template to ensure config is persisted
 */
export function generatePdfConfigComment(config: PdfConfig): string {
  const configObj: Record<string, unknown> = {
    primary_color: config.primary_color,
    secondary_color: config.secondary_color,
    accent_color: config.accent_color,
    show_logo: config.show_logo,
    logo_position: config.logo_position,
    show_iban_footer: config.show_iban_footer,
    show_notes: config.show_notes,
    show_discounts_column: config.show_discounts_column,
    header_style: config.header_style,
    font_size_base: config.font_size_base,

    // Extended configurable parameters
    title_text: config.title_text,
    title_size: config.title_size,
    title_color: config.title_color,
    client_box_color: config.client_box_color,
    table_header_color: config.table_header_color,
    show_footer_legal: config.show_footer_legal,
    footer_legal_lines: config.footer_legal_lines,

    // Spacing
    line_spacing: config.line_spacing,
    section_spacing: config.section_spacing,
    row_height: config.row_height,
    client_box_padding: config.client_box_padding,
    margins: config.margins,

    // Table borders
    show_table_borders: config.show_table_borders,
    table_border_color: config.table_border_color,
  };

  // Remove undefined values
  Object.keys(configObj).forEach((key) => {
    if (configObj[key] === undefined) delete configObj[key];
  });

  return `<!-- PDF_CONFIG: ${JSON.stringify(configObj)} -->`;
}

/**
 * Update template content with PDF_CONFIG comment
 */
export function embedPdfConfigInTemplate(content: string, config: PdfConfig): string {
  // Remove existing PDF_CONFIG comment if present
  const cleanedContent = content.replace(/<!--\s*PDF_CONFIG:[^>]+-->\s*/g, '');
  
  // Add new PDF_CONFIG comment at the beginning
  return generatePdfConfigComment(config) + '\n' + cleanedContent;
}

/**
 * Replace template variables with actual data
 */
export function replaceTemplateVariables(
  content: string,
  data: {
    company_name?: string;
    company_cif?: string;
    company_address?: string;
    company_city?: string;
    company_postal_code?: string;
    company_phone?: string;
    company_email?: string;
    company_iban?: string;
    client_name?: string;
    client_cif?: string;
    client_address?: string;
    client_email?: string;
    document_number?: string;
    document_date?: string;
    due_date?: string;
    valid_until?: string;
    start_date?: string;
    end_date?: string;
    subtotal?: string;
    iva_percent?: string;
    iva_amount?: string;
    total?: string;
    notes?: string;
    services_rows?: string;
  }
): string {
  let result = content;
  
  // Replace all variables
  Object.entries(data).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value || '');
  });

  return result;
}
