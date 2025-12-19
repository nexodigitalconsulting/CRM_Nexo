import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
        .order('created_at', { ascending: true })
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
 * Extract primary and secondary colors from HTML template content
 */
export function extractColorsFromTemplate(content: string): { primaryColor: string; secondaryColor: string } {
  // Default colors
  let primaryColor = '#3366cc';
  let secondaryColor = '#666666';

  // Look for CSS custom properties or inline styles
  const primaryMatch = content.match(/--primary-color:\s*([^;]+)/i) 
    || content.match(/color:\s*(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})/);
  const secondaryMatch = content.match(/--secondary-color:\s*([^;]+)/i);

  if (primaryMatch) {
    primaryColor = primaryMatch[1].trim();
  }
  if (secondaryMatch) {
    secondaryColor = secondaryMatch[1].trim();
  }

  return { primaryColor, secondaryColor };
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
