export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      calendar_categories: {
        Row: {
          color: string
          created_at: string | null
          id: string
          importance: Database["public"]["Enums"]["event_importance"] | null
          is_default: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string | null
          id?: string
          importance?: Database["public"]["Enums"]["event_importance"] | null
          is_default?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          importance?: Database["public"]["Enums"]["event_importance"] | null
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          all_day: boolean | null
          category_id: string | null
          client_id: string | null
          contact_id: string | null
          contract_id: string | null
          created_at: string | null
          description: string | null
          end_datetime: string
          google_calendar_id: string | null
          google_event_id: string | null
          id: string
          importance: Database["public"]["Enums"]["event_importance"] | null
          is_synced_to_google: boolean | null
          location: string | null
          notes: string | null
          recurrence_rule: string | null
          reminder_minutes: number | null
          start_datetime: string
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          all_day?: boolean | null
          category_id?: string | null
          client_id?: string | null
          contact_id?: string | null
          contract_id?: string | null
          created_at?: string | null
          description?: string | null
          end_datetime: string
          google_calendar_id?: string | null
          google_event_id?: string | null
          id?: string
          importance?: Database["public"]["Enums"]["event_importance"] | null
          is_synced_to_google?: boolean | null
          location?: string | null
          notes?: string | null
          recurrence_rule?: string | null
          reminder_minutes?: number | null
          start_datetime: string
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          all_day?: boolean | null
          category_id?: string | null
          client_id?: string | null
          contact_id?: string | null
          contract_id?: string | null
          created_at?: string | null
          description?: string | null
          end_datetime?: string
          google_calendar_id?: string | null
          google_event_id?: string | null
          id?: string
          importance?: Database["public"]["Enums"]["event_importance"] | null
          is_synced_to_google?: boolean | null
          location?: string | null
          notes?: string | null
          recurrence_rule?: string | null
          reminder_minutes?: number | null
          start_datetime?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "calendar_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          address: string | null
          business_name: string | null
          campaign_number: number
          capture_date: string | null
          category: string | null
          city: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          place_id: string | null
          postal_code: string | null
          province: string | null
          status: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          business_name?: string | null
          campaign_number?: number
          capture_date?: string | null
          category?: string | null
          city?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          place_id?: string | null
          postal_code?: string | null
          province?: string | null
          status?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          business_name?: string | null
          campaign_number?: number
          capture_date?: string | null
          category?: string | null
          city?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          place_id?: string | null
          postal_code?: string | null
          province?: string | null
          status?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      client_notification_preferences: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          is_enabled: boolean | null
          rule_type: string
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          rule_type: string
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          rule_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_notification_preferences_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          cif: string | null
          city: string | null
          client_number: number
          contact_id: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          iban: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          postal_code: string | null
          province: string | null
          segment: Database["public"]["Enums"]["client_segment"] | null
          source: string | null
          status: Database["public"]["Enums"]["client_status"] | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          cif?: string | null
          city?: string | null
          client_number?: number
          contact_id?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          iban?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          segment?: Database["public"]["Enums"]["client_segment"] | null
          source?: string | null
          status?: Database["public"]["Enums"]["client_status"] | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          cif?: string | null
          city?: string | null
          client_number?: number
          contact_id?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          iban?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          segment?: Database["public"]["Enums"]["client_segment"] | null
          source?: string | null
          status?: Database["public"]["Enums"]["client_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          address: string | null
          cif: string | null
          city: string | null
          country: string | null
          created_at: string | null
          currency: string | null
          date_format: string | null
          email: string | null
          iban: string | null
          id: string
          language: string | null
          logo_url: string | null
          name: string
          phone: string | null
          postal_code: string | null
          province: string | null
          timezone: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          cif?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          date_format?: string | null
          email?: string | null
          iban?: string | null
          id?: string
          language?: string | null
          logo_url?: string | null
          name: string
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          timezone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          cif?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          date_format?: string | null
          email?: string | null
          iban?: string | null
          id?: string
          language?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          timezone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          contact_number: number
          created_at: string | null
          created_by: string | null
          email: string | null
          id: string
          meeting_date: string | null
          name: string
          notes: string | null
          phone: string | null
          presentation_url: string | null
          quote_url: string | null
          source: string | null
          status: Database["public"]["Enums"]["contact_status"] | null
          updated_at: string | null
        }
        Insert: {
          contact_number?: number
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          meeting_date?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          presentation_url?: string | null
          quote_url?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["contact_status"] | null
          updated_at?: string | null
        }
        Update: {
          contact_number?: number
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          meeting_date?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          presentation_url?: string | null
          quote_url?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["contact_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      contract_services: {
        Row: {
          contract_id: string
          created_at: string | null
          discount_amount: number | null
          discount_percent: number | null
          id: string
          is_active: boolean | null
          iva_amount: number | null
          iva_percent: number | null
          quantity: number | null
          service_id: string
          subtotal: number
          total: number
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          contract_id: string
          created_at?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          is_active?: boolean | null
          iva_amount?: number | null
          iva_percent?: number | null
          quantity?: number | null
          service_id: string
          subtotal: number
          total: number
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          contract_id?: string
          created_at?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          is_active?: boolean | null
          iva_amount?: number | null
          iva_percent?: number | null
          quantity?: number | null
          service_id?: string
          subtotal?: number
          total?: number
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_services_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          billing_period: Database["public"]["Enums"]["billing_period"] | null
          client_id: string
          contract_number: number
          created_at: string | null
          created_by: string | null
          document_url: string | null
          end_date: string | null
          id: string
          is_sent: boolean | null
          iva_total: number | null
          name: string | null
          next_billing_date: string | null
          notes: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          quote_id: string | null
          sent_at: string | null
          start_date: string
          status: Database["public"]["Enums"]["contract_status"] | null
          subtotal: number | null
          total: number | null
          updated_at: string | null
        }
        Insert: {
          billing_period?: Database["public"]["Enums"]["billing_period"] | null
          client_id: string
          contract_number?: number
          created_at?: string | null
          created_by?: string | null
          document_url?: string | null
          end_date?: string | null
          id?: string
          is_sent?: boolean | null
          iva_total?: number | null
          name?: string | null
          next_billing_date?: string | null
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          quote_id?: string | null
          sent_at?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["contract_status"] | null
          subtotal?: number | null
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          billing_period?: Database["public"]["Enums"]["billing_period"] | null
          client_id?: string
          contract_number?: number
          created_at?: string | null
          created_by?: string | null
          document_url?: string | null
          end_date?: string | null
          id?: string
          is_sent?: boolean | null
          iva_total?: number | null
          name?: string | null
          next_billing_date?: string | null
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          quote_id?: string | null
          sent_at?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["contract_status"] | null
          subtotal?: number | null
          total?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          entity_type: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          entity_type: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          entity_type?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: []
      }
      documents_rag: {
        Row: {
          content: string
          embedding: string | null
          id: number
          metadata: Json | null
        }
        Insert: {
          content: string
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Update: {
          content?: string
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Relationships: []
      }
      email_settings: {
        Row: {
          created_at: string | null
          from_email: string
          from_name: string | null
          id: string
          is_active: boolean | null
          smtp_host: string
          smtp_password: string
          smtp_port: number
          smtp_secure: boolean | null
          smtp_user: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          from_email: string
          from_name?: string | null
          id?: string
          is_active?: boolean | null
          smtp_host: string
          smtp_password: string
          smtp_port?: number
          smtp_secure?: boolean | null
          smtp_user: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          from_email?: string
          from_name?: string | null
          id?: string
          is_active?: boolean | null
          smtp_host?: string
          smtp_password?: string
          smtp_port?: number
          smtp_secure?: boolean | null
          smtp_user?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body_html: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          subject: string
          template_type: string
          updated_at: string | null
        }
        Insert: {
          body_html: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          subject: string
          template_type: string
          updated_at?: string | null
        }
        Update: {
          body_html?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string
          template_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      entity_configurations: {
        Row: {
          created_at: string | null
          created_by: string | null
          display_name: string
          entity_name: string
          fields: Json
          icon: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          display_name: string
          entity_name: string
          fields?: Json
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          display_name?: string
          entity_name?: string
          fields?: Json
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          concept: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          document_url: string | null
          due_date: string | null
          expense_number: number
          id: string
          invoice_number: string | null
          irpf_amount: number | null
          irpf_percent: number | null
          issue_date: string
          iva_amount: number | null
          iva_percent: number | null
          notes: string | null
          status: string | null
          subtotal: number | null
          supplier_cif: string | null
          supplier_name: string
          total: number | null
          updated_at: string | null
        }
        Insert: {
          concept?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          document_url?: string | null
          due_date?: string | null
          expense_number?: number
          id?: string
          invoice_number?: string | null
          irpf_amount?: number | null
          irpf_percent?: number | null
          issue_date: string
          iva_amount?: number | null
          iva_percent?: number | null
          notes?: string | null
          status?: string | null
          subtotal?: number | null
          supplier_cif?: string | null
          supplier_name: string
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          concept?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          document_url?: string | null
          due_date?: string | null
          expense_number?: number
          id?: string
          invoice_number?: string | null
          irpf_amount?: number | null
          irpf_percent?: number | null
          issue_date?: string
          iva_amount?: number | null
          iva_percent?: number | null
          notes?: string | null
          status?: string | null
          subtotal?: number | null
          supplier_cif?: string | null
          supplier_name?: string
          total?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      google_calendar_config: {
        Row: {
          access_token: string | null
          calendar_id: string | null
          created_at: string | null
          id: string
          last_sync_at: string | null
          refresh_token: string | null
          sync_direction: string | null
          sync_enabled: boolean | null
          token_expiry: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token?: string | null
          calendar_id?: string | null
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          refresh_token?: string | null
          sync_direction?: string | null
          sync_enabled?: boolean | null
          token_expiry?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string | null
          calendar_id?: string | null
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          refresh_token?: string | null
          sync_direction?: string | null
          sync_enabled?: boolean | null
          token_expiry?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      invoice_products: {
        Row: {
          client_cif: string | null
          client_id: string
          client_name: string
          created_at: string | null
          discount_amount: number | null
          discount_percent: number | null
          id: string
          invoice_date: string
          invoice_id: string
          invoice_number: number
          invoice_status: string | null
          iva_amount: number | null
          iva_percent: number | null
          quantity: number
          service_category: string | null
          service_id: string
          service_name: string
          subtotal: number
          total: number
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          client_cif?: string | null
          client_id: string
          client_name: string
          created_at?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          invoice_date: string
          invoice_id: string
          invoice_number: number
          invoice_status?: string | null
          iva_amount?: number | null
          iva_percent?: number | null
          quantity?: number
          service_category?: string | null
          service_id: string
          service_name: string
          subtotal: number
          total: number
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          client_cif?: string | null
          client_id?: string
          client_name?: string
          created_at?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          invoice_date?: string
          invoice_id?: string
          invoice_number?: number
          invoice_status?: string | null
          iva_amount?: number | null
          iva_percent?: number | null
          quantity?: number
          service_category?: string | null
          service_id?: string
          service_name?: string
          subtotal?: number
          total?: number
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_products_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_products_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_products_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_services: {
        Row: {
          created_at: string | null
          description: string | null
          discount_amount: number | null
          discount_percent: number | null
          id: string
          invoice_id: string
          iva_amount: number | null
          iva_percent: number | null
          quantity: number | null
          service_id: string
          subtotal: number
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          invoice_id: string
          iva_amount?: number | null
          iva_percent?: number | null
          quantity?: number | null
          service_id: string
          subtotal: number
          total: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          invoice_id?: string
          iva_amount?: number | null
          iva_percent?: number | null
          quantity?: number | null
          service_id?: string
          subtotal?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_services_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_id: string
          contract_id: string | null
          created_at: string | null
          created_by: string | null
          document_url: string | null
          due_date: string | null
          id: string
          invoice_number: number
          is_sent: boolean | null
          issue_date: string
          iva_amount: number | null
          iva_percent: number | null
          notes: string | null
          remittance_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["invoice_status"] | null
          subtotal: number | null
          total: number | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          document_url?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: number
          is_sent?: boolean | null
          issue_date?: string
          iva_amount?: number | null
          iva_percent?: number | null
          notes?: string | null
          remittance_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          subtotal?: number | null
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          document_url?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: number
          is_sent?: boolean | null
          issue_date?: string
          iva_amount?: number | null
          iva_percent?: number | null
          notes?: string | null
          remittance_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          subtotal?: number | null
          total?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_invoice_remittance"
            columns: ["remittance_id"]
            isOneToOne: false
            referencedRelation: "remittances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_queue: {
        Row: {
          client_id: string | null
          created_at: string | null
          entity_id: string
          entity_type: string
          error_message: string | null
          id: string
          rule_type: string
          sent_at: string | null
          status: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          entity_id: string
          entity_type: string
          error_message?: string | null
          id?: string
          rule_type: string
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          error_message?: string | null
          id?: string
          rule_type?: string
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_queue_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_rules: {
        Row: {
          created_at: string | null
          days_threshold: number | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          rule_type: string
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          days_threshold?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          rule_type: string
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          days_threshold?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          rule_type?: string
          template_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_rules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          language: string | null
          phone: string | null
          timezone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          phone?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          phone?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      quote_products: {
        Row: {
          client_id: string | null
          client_name: string | null
          contact_id: string | null
          contact_name: string | null
          created_at: string | null
          discount_amount: number | null
          discount_percent: number | null
          id: string
          iva_amount: number | null
          iva_percent: number | null
          quantity: number
          quote_date: string
          quote_id: string
          quote_number: number
          quote_status: string | null
          service_category: string | null
          service_id: string
          service_name: string
          subtotal: number
          total: number
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          client_name?: string | null
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          iva_amount?: number | null
          iva_percent?: number | null
          quantity?: number
          quote_date: string
          quote_id: string
          quote_number: number
          quote_status?: string | null
          service_category?: string | null
          service_id: string
          service_name: string
          subtotal: number
          total: number
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          client_name?: string | null
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          iva_amount?: number | null
          iva_percent?: number | null
          quantity?: number
          quote_date?: string
          quote_id?: string
          quote_number?: number
          quote_status?: string | null
          service_category?: string | null
          service_id?: string
          service_name?: string
          subtotal?: number
          total?: number
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_products_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_products_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_products_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_products_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_services: {
        Row: {
          created_at: string | null
          discount_amount: number | null
          discount_percent: number | null
          id: string
          iva_amount: number | null
          iva_percent: number | null
          quantity: number | null
          quote_id: string
          service_id: string
          subtotal: number
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          iva_amount?: number | null
          iva_percent?: number | null
          quantity?: number | null
          quote_id: string
          service_id: string
          subtotal: number
          total: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          iva_amount?: number | null
          iva_percent?: number | null
          quantity?: number | null
          quote_id?: string
          service_id?: string
          subtotal?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_services_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          client_id: string | null
          contact_id: string | null
          created_at: string | null
          created_by: string | null
          document_url: string | null
          id: string
          is_sent: boolean | null
          iva_total: number | null
          name: string | null
          notes: string | null
          quote_number: number
          sent_at: string | null
          status: Database["public"]["Enums"]["quote_status"] | null
          subtotal: number | null
          total: number | null
          updated_at: string | null
          valid_until: string | null
        }
        Insert: {
          client_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          document_url?: string | null
          id?: string
          is_sent?: boolean | null
          iva_total?: number | null
          name?: string | null
          notes?: string | null
          quote_number?: number
          sent_at?: string | null
          status?: Database["public"]["Enums"]["quote_status"] | null
          subtotal?: number | null
          total?: number | null
          updated_at?: string | null
          valid_until?: string | null
        }
        Update: {
          client_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          document_url?: string | null
          id?: string
          is_sent?: boolean | null
          iva_total?: number | null
          name?: string | null
          notes?: string | null
          quote_number?: number
          sent_at?: string | null
          status?: Database["public"]["Enums"]["quote_status"] | null
          subtotal?: number | null
          total?: number | null
          updated_at?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      remittances: {
        Row: {
          code: string | null
          created_at: string | null
          created_by: string | null
          id: string
          invoice_count: number | null
          issue_date: string
          n19_file_url: string | null
          notes: string | null
          remittance_number: number
          status: Database["public"]["Enums"]["remittance_status"] | null
          total_amount: number | null
          updated_at: string | null
          xml_file_url: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          invoice_count?: number | null
          issue_date?: string
          n19_file_url?: string | null
          notes?: string | null
          remittance_number?: number
          status?: Database["public"]["Enums"]["remittance_status"] | null
          total_amount?: number | null
          updated_at?: string | null
          xml_file_url?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          invoice_count?: number | null
          issue_date?: string
          n19_file_url?: string | null
          notes?: string | null
          remittance_number?: number
          status?: Database["public"]["Enums"]["remittance_status"] | null
          total_amount?: number | null
          updated_at?: string | null
          xml_file_url?: string | null
        }
        Relationships: []
      }
      services: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          iva_percent: number | null
          name: string
          price: number
          service_number: number
          status: Database["public"]["Enums"]["service_status"] | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          iva_percent?: number | null
          name: string
          price?: number
          service_number?: number
          status?: Database["public"]["Enums"]["service_status"] | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          iva_percent?: number | null
          name?: string
          price?: number
          service_number?: number
          status?: Database["public"]["Enums"]["service_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_availability: {
        Row: {
          created_at: string | null
          day_of_week: number
          end_time: string
          id: string
          is_available: boolean | null
          start_time: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          end_time: string
          id?: string
          is_available?: boolean | null
          start_time: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          is_available?: boolean | null
          start_time?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_table_views: {
        Row: {
          column_order: Json | null
          created_at: string | null
          entity_name: string
          filters: Json | null
          id: string
          is_default: boolean | null
          sort_config: Json | null
          updated_at: string | null
          user_id: string
          view_name: string
          visible_columns: Json
        }
        Insert: {
          column_order?: Json | null
          created_at?: string | null
          entity_name: string
          filters?: Json | null
          id?: string
          is_default?: boolean | null
          sort_config?: Json | null
          updated_at?: string | null
          user_id: string
          view_name: string
          visible_columns?: Json
        }
        Update: {
          column_order?: Json | null
          created_at?: string | null
          entity_name?: string
          filters?: Json | null
          id?: string
          is_default?: boolean | null
          sort_config?: Json | null
          updated_at?: string | null
          user_id?: string
          view_name?: string
          visible_columns?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_first_admin: {
        Args: { _email: string; _full_name?: string; _user_id: string }
        Returns: Json
      }
      has_any_role: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      match_documents_rag: {
        Args: { filter?: Json; match_count?: number; query_embedding: string }
        Returns: {
          content: string
          id: number
          metadata: Json
          similarity: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "user" | "readonly"
      billing_period: "monthly" | "quarterly" | "annual" | "one_time" | "other"
      client_segment: "corporate" | "pyme" | "entrepreneur" | "individual"
      client_status: "active" | "inactive"
      contact_status:
        | "new"
        | "contacted"
        | "follow_up"
        | "discarded"
        | "converted"
      contract_status: "active" | "expired" | "cancelled" | "pending_activation"
      event_importance: "high" | "medium" | "low"
      invoice_status: "draft" | "issued" | "paid" | "cancelled"
      payment_status: "paid" | "pending" | "partial" | "claimed"
      quote_status: "draft" | "sent" | "approved" | "rejected"
      remittance_status: "pending" | "paid" | "partial" | "overdue"
      service_status: "active" | "inactive" | "development"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "manager", "user", "readonly"],
      billing_period: ["monthly", "quarterly", "annual", "one_time", "other"],
      client_segment: ["corporate", "pyme", "entrepreneur", "individual"],
      client_status: ["active", "inactive"],
      contact_status: [
        "new",
        "contacted",
        "follow_up",
        "discarded",
        "converted",
      ],
      contract_status: ["active", "expired", "cancelled", "pending_activation"],
      event_importance: ["high", "medium", "low"],
      invoice_status: ["draft", "issued", "paid", "cancelled"],
      payment_status: ["paid", "pending", "partial", "claimed"],
      quote_status: ["draft", "sent", "approved", "rejected"],
      remittance_status: ["pending", "paid", "partial", "overdue"],
      service_status: ["active", "inactive", "development"],
    },
  },
} as const
