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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      api_tokens: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          name: string
          token_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          name: string
          token_hash: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          name?: string
          token_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      attack_vector_versions: {
        Row: {
          attack_vector_id: string
          created_at: string | null
          description: string
          diagram: string | null
          id: string
          timeline: Json | null
          version_number: number
          vulnerability_count: number | null
        }
        Insert: {
          attack_vector_id: string
          created_at?: string | null
          description: string
          diagram?: string | null
          id?: string
          timeline?: Json | null
          version_number?: number
          vulnerability_count?: number | null
        }
        Update: {
          attack_vector_id?: string
          created_at?: string | null
          description?: string
          diagram?: string | null
          id?: string
          timeline?: Json | null
          version_number?: number
          vulnerability_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attack_vector_versions_attack_vector_id_fkey"
            columns: ["attack_vector_id"]
            isOneToOne: false
            referencedRelation: "attack_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
      attack_vectors: {
        Row: {
          client_visible: boolean
          created_at: string | null
          description: string
          diagram: string | null
          id: string
          project_id: string
          timeline: Json | null
          updated_at: string | null
          user_id: string
          vulnerability_count: number | null
        }
        Insert: {
          client_visible?: boolean
          created_at?: string | null
          description: string
          diagram?: string | null
          id?: string
          project_id: string
          timeline?: Json | null
          updated_at?: string | null
          user_id: string
          vulnerability_count?: number | null
        }
        Update: {
          client_visible?: boolean
          created_at?: string | null
          description?: string
          diagram?: string | null
          id?: string
          project_id?: string
          timeline?: Json | null
          updated_at?: string | null
          user_id?: string
          vulnerability_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attack_vectors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          category: string | null
          created_at: string
          details: Json | null
          error_message: string | null
          id: string
          ip_address: string | null
          resource_id: string | null
          resource_name: string | null
          resource_type: string | null
          success: boolean | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          category?: string | null
          created_at?: string
          details?: Json | null
          error_message?: string | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          category?: string | null
          created_at?: string
          details?: Json | null
          error_message?: string | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      client_access: {
        Row: {
          access_token: string | null
          client_email: string
          client_id: string
          client_name: string | null
          client_user_id: string | null
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          last_login_at: string | null
          owner_id: string
          project_id: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          client_email: string
          client_id: string
          client_name?: string | null
          client_user_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          owner_id: string
          project_id?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          client_email?: string
          client_id?: string
          client_name?: string | null
          client_user_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          owner_id?: string
          project_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_access_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_access_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_access_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contacts: {
        Row: {
          client_id: string
          created_at: string
          email: string | null
          id: string
          is_primary: boolean | null
          name: string
          phone: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notification_emails: {
        Row: {
          client_access_id: string
          created_at: string
          email: string
          id: string
          is_verified: boolean | null
        }
        Insert: {
          client_access_id: string
          created_at?: string
          email: string
          id?: string
          is_verified?: boolean | null
        }
        Update: {
          client_access_id?: string
          created_at?: string
          email?: string
          id?: string
          is_verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "client_notification_emails_client_access_id_fkey"
            columns: ["client_access_id"]
            isOneToOne: false
            referencedRelation: "client_access"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notifications: {
        Row: {
          client_access_id: string | null
          created_at: string
          id: string
          is_read: boolean | null
          message: string | null
          notification_type: Database["public"]["Enums"]["notification_type"]
          project_id: string
          project_name: string | null
          target_url: string | null
          vulnerability_id: string | null
          vulnerability_title: string | null
        }
        Insert: {
          client_access_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string | null
          notification_type: Database["public"]["Enums"]["notification_type"]
          project_id: string
          project_name?: string | null
          target_url?: string | null
          vulnerability_id?: string | null
          vulnerability_title?: string | null
        }
        Update: {
          client_access_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string | null
          notification_type?: Database["public"]["Enums"]["notification_type"]
          project_id?: string
          project_name?: string | null
          target_url?: string | null
          vulnerability_id?: string | null
          vulnerability_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_notifications_client_access_id_fkey"
            columns: ["client_access_id"]
            isOneToOne: false
            referencedRelation: "client_access"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notifications_vulnerability_id_fkey"
            columns: ["vulnerability_id"]
            isOneToOne: false
            referencedRelation: "vulnerabilities"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          branding: Json | null
          company_logo_url: string | null
          company_name: string
          company_website: string | null
          created_at: string
          id: string
          is_active: boolean | null
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          branding?: Json | null
          company_logo_url?: string | null
          company_name: string
          company_website?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          branding?: Json | null
          company_logo_url?: string | null
          company_name?: string
          company_website?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      file_versions: {
        Row: {
          change_summary: string | null
          content: string | null
          created_at: string
          created_by: string | null
          file_id: string
          id: string
          size_bytes: number | null
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          file_id: string
          id?: string
          size_bytes?: number | null
          version_number?: number
        }
        Update: {
          change_summary?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          file_id?: string
          id?: string
          size_bytes?: number | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "file_versions_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          content: string | null
          created_at: string
          file_type: string | null
          folder_id: string | null
          id: string
          is_locked: boolean | null
          mime_type: string | null
          name: string
          project_id: string
          size_bytes: number | null
          storage_path: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          file_type?: string | null
          folder_id?: string | null
          id?: string
          is_locked?: boolean | null
          mime_type?: string | null
          name: string
          project_id: string
          size_bytes?: number | null
          storage_path?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          file_type?: string | null
          folder_id?: string | null
          id?: string
          is_locked?: boolean | null
          mime_type?: string | null
          name?: string
          project_id?: string
          size_bytes?: number | null
          storage_path?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "files_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          created_at: string
          id: string
          is_locked: boolean | null
          name: string
          parent_id: string | null
          project_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_locked?: boolean | null
          name: string
          parent_id?: string | null
          project_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_locked?: boolean | null
          name?: string
          parent_id?: string | null
          project_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_comment_reply: boolean
          email_enabled: boolean
          email_project_created: boolean
          email_report_generated: boolean
          email_retest_requested: boolean
          email_vulnerability_added: boolean
          email_vulnerability_removed: boolean
          email_vulnerability_updated: boolean
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_comment_reply?: boolean
          email_enabled?: boolean
          email_project_created?: boolean
          email_report_generated?: boolean
          email_retest_requested?: boolean
          email_vulnerability_added?: boolean
          email_vulnerability_removed?: boolean
          email_vulnerability_updated?: boolean
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_comment_reply?: boolean
          email_enabled?: boolean
          email_project_created?: boolean
          email_report_generated?: boolean
          email_retest_requested?: boolean
          email_vulnerability_added?: boolean
          email_vulnerability_removed?: boolean
          email_vulnerability_updated?: boolean
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pentester_notifications: {
        Row: {
          created_at: string
          from_user_id: string | null
          id: string
          is_read: boolean | null
          message: string | null
          notification_type: string
          project_id: string | null
          project_name: string | null
          target_url: string | null
          user_id: string
          vulnerability_id: string | null
          vulnerability_title: string | null
        }
        Insert: {
          created_at?: string
          from_user_id?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          notification_type: string
          project_id?: string | null
          project_name?: string | null
          target_url?: string | null
          user_id: string
          vulnerability_id?: string | null
          vulnerability_title?: string | null
        }
        Update: {
          created_at?: string
          from_user_id?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          notification_type?: string
          project_id?: string | null
          project_name?: string | null
          target_url?: string | null
          user_id?: string
          vulnerability_id?: string | null
          vulnerability_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pentester_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pentester_notifications_vulnerability_id_fkey"
            columns: ["vulnerability_id"]
            isOneToOne: false
            referencedRelation: "vulnerabilities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          organization_id: string | null
          organization_name: string | null
          updated_at: string
          user_type: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id: string
          last_name?: string | null
          organization_id?: string | null
          organization_name?: string | null
          updated_at?: string
          user_type?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          organization_id?: string | null
          organization_name?: string | null
          updated_at?: string
          user_type?: string | null
          username?: string | null
        }
        Relationships: []
      }
      project_reports: {
        Row: {
          client_visible: boolean
          created_at: string
          created_by: string | null
          file_size: number | null
          html_content: string
          id: string
          is_archived: boolean | null
          name: string
          project_id: string
          report_type: string | null
          updated_at: string | null
        }
        Insert: {
          client_visible?: boolean
          created_at?: string
          created_by?: string | null
          file_size?: number | null
          html_content: string
          id?: string
          is_archived?: boolean | null
          name: string
          project_id: string
          report_type?: string | null
          updated_at?: string | null
        }
        Update: {
          client_visible?: boolean
          created_at?: string
          created_by?: string | null
          file_size?: number | null
          html_content?: string
          id?: string
          is_archived?: boolean | null
          name?: string
          project_id?: string
          report_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          branding: Json | null
          client_id: string | null
          created_at: string
          description: string | null
          end_date: string | null
          environment: Database["public"]["Enums"]["environment_type"] | null
          id: string
          model_external: Database["public"]["Enums"]["model_type"] | null
          model_internal: Database["public"]["Enums"]["model_type"] | null
          name: string
          rules_of_engagement: string | null
          scope: Json | null
          start_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          branding?: Json | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          environment?: Database["public"]["Enums"]["environment_type"] | null
          id?: string
          model_external?: Database["public"]["Enums"]["model_type"] | null
          model_internal?: Database["public"]["Enums"]["model_type"] | null
          name: string
          rules_of_engagement?: string | null
          scope?: Json | null
          start_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          branding?: Json | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          environment?: Database["public"]["Enums"]["environment_type"] | null
          id?: string
          model_external?: Database["public"]["Enums"]["model_type"] | null
          model_internal?: Database["public"]["Enums"]["model_type"] | null
          name?: string
          rules_of_engagement?: string | null
          scope?: Json | null
          start_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendations: {
        Row: {
          client_visible: boolean
          created_at: string
          estimated_total_investment: string | null
          expected_roi: string | null
          id: string
          key_findings: Json | null
          priority_matrix: Json | null
          project_context: Json | null
          project_id: string
          recommendations: Json | null
          summary: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_visible?: boolean
          created_at?: string
          estimated_total_investment?: string | null
          expected_roi?: string | null
          id?: string
          key_findings?: Json | null
          priority_matrix?: Json | null
          project_context?: Json | null
          project_id: string
          recommendations?: Json | null
          summary: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_visible?: boolean
          created_at?: string
          estimated_total_investment?: string | null
          expected_roi?: string | null
          id?: string
          key_findings?: Json | null
          priority_matrix?: Json | null
          project_context?: Json | null
          project_id?: string
          recommendations?: Json | null
          summary?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      remediation_strategies: {
        Row: {
          client_visible: boolean
          created_at: string
          executive_summary: string
          id: string
          items: Json
          long_term_goals: Json | null
          project_id: string
          quick_wins: Json | null
          recommended_timeline: string | null
          total_effort: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          client_visible?: boolean
          created_at?: string
          executive_summary: string
          id?: string
          items?: Json
          long_term_goals?: Json | null
          project_id: string
          quick_wins?: Json | null
          recommended_timeline?: string | null
          total_effort?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          client_visible?: boolean
          created_at?: string
          executive_summary?: string
          id?: string
          items?: Json
          long_term_goals?: Json | null
          project_id?: string
          quick_wins?: Json | null
          recommended_timeline?: string | null
          total_effort?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "remediation_strategies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      shares: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          permission: Database["public"]["Enums"]["permission_type"] | null
          resource_id: string
          resource_type: string
          shared_with_email: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          permission?: Database["public"]["Enums"]["permission_type"] | null
          resource_id: string
          resource_type: string
          shared_with_email: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          permission?: Database["public"]["Enums"]["permission_type"] | null
          resource_id?: string
          resource_type?: string
          shared_with_email?: string
          updated_at?: string
        }
        Relationships: []
      }
      vulnerabilities: {
        Row: {
          affected_assets: string[] | null
          attachments: Json | null
          created_at: string
          custom_fields: Json | null
          cve_ids: string[] | null
          cvss_score: number | null
          cvss_vector: string | null
          cwe_id: string | null
          description: string | null
          detailed_description: string | null
          execution_command: string | null
          folder_id: string | null
          id: string
          likelihood: string | null
          owasp_category: string | null
          owasp_item: string | null
          project_id: string
          proof_of_concept: string | null
          reference_urls: string[] | null
          remediation: string | null
          retest_requested_at: string | null
          retest_requested_by: string | null
          retest_status: Database["public"]["Enums"]["retest_status"] | null
          retest_updated_at: string | null
          severity: Database["public"]["Enums"]["severity_type"] | null
          status: Database["public"]["Enums"]["vuln_status"] | null
          status_reason: string | null
          status_updated_at: string | null
          submitted_by: string | null
          submitted_by_name: string | null
          title: string
          tool: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          affected_assets?: string[] | null
          attachments?: Json | null
          created_at?: string
          custom_fields?: Json | null
          cve_ids?: string[] | null
          cvss_score?: number | null
          cvss_vector?: string | null
          cwe_id?: string | null
          description?: string | null
          detailed_description?: string | null
          execution_command?: string | null
          folder_id?: string | null
          id?: string
          likelihood?: string | null
          owasp_category?: string | null
          owasp_item?: string | null
          project_id: string
          proof_of_concept?: string | null
          reference_urls?: string[] | null
          remediation?: string | null
          retest_requested_at?: string | null
          retest_requested_by?: string | null
          retest_status?: Database["public"]["Enums"]["retest_status"] | null
          retest_updated_at?: string | null
          severity?: Database["public"]["Enums"]["severity_type"] | null
          status?: Database["public"]["Enums"]["vuln_status"] | null
          status_reason?: string | null
          status_updated_at?: string | null
          submitted_by?: string | null
          submitted_by_name?: string | null
          title: string
          tool?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          affected_assets?: string[] | null
          attachments?: Json | null
          created_at?: string
          custom_fields?: Json | null
          cve_ids?: string[] | null
          cvss_score?: number | null
          cvss_vector?: string | null
          cwe_id?: string | null
          description?: string | null
          detailed_description?: string | null
          execution_command?: string | null
          folder_id?: string | null
          id?: string
          likelihood?: string | null
          owasp_category?: string | null
          owasp_item?: string | null
          project_id?: string
          proof_of_concept?: string | null
          reference_urls?: string[] | null
          remediation?: string | null
          retest_requested_at?: string | null
          retest_requested_by?: string | null
          retest_status?: Database["public"]["Enums"]["retest_status"] | null
          retest_updated_at?: string | null
          severity?: Database["public"]["Enums"]["severity_type"] | null
          status?: Database["public"]["Enums"]["vuln_status"] | null
          status_reason?: string | null
          status_updated_at?: string | null
          submitted_by?: string | null
          submitted_by_name?: string | null
          title?: string
          tool?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vulnerabilities_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vulnerabilities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      vulnerability_comments: {
        Row: {
          comment_type: Database["public"]["Enums"]["comment_type"] | null
          content: string
          created_at: string
          id: string
          is_resolved: boolean | null
          parent_id: string | null
          updated_at: string
          user_id: string | null
          vulnerability_id: string
        }
        Insert: {
          comment_type?: Database["public"]["Enums"]["comment_type"] | null
          content: string
          created_at?: string
          id?: string
          is_resolved?: boolean | null
          parent_id?: string | null
          updated_at?: string
          user_id?: string | null
          vulnerability_id: string
        }
        Update: {
          comment_type?: Database["public"]["Enums"]["comment_type"] | null
          content?: string
          created_at?: string
          id?: string
          is_resolved?: boolean | null
          parent_id?: string | null
          updated_at?: string
          user_id?: string | null
          vulnerability_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vulnerability_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "vulnerability_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vulnerability_comments_vulnerability_id_fkey"
            columns: ["vulnerability_id"]
            isOneToOne: false
            referencedRelation: "vulnerabilities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      client_stats: {
        Row: {
          client_id: string | null
          open_vulnerabilities: number | null
          project_count: number | null
          total_vulnerabilities: number | null
          user_id: string | null
          waiting_retest: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_client_invitation: { Args: { p_token: string }; Returns: boolean }
      request_client_retests: { Args: { p_ids: string[] }; Returns: number }
      admin_confirm_client_email: {
        Args: { p_access_id?: string; p_user_id: string }
        Returns: boolean
      }
      can_view_profile: { Args: { profile_id: string }; Returns: boolean }
      cleanup_old_audit_logs: { Args: never; Returns: undefined }
      is_client_for_project: {
        Args: { p_project_id: string }
        Returns: boolean
      }
      link_client_to_access: {
        Args: { p_access_id?: string; p_token: string; p_user_id: string }
        Returns: boolean
      }
      rollback_file_version: {
        Args: { p_file_id: string; p_version_id: string }
        Returns: boolean
      }
      update_client_last_login: {
        Args: { p_access_id?: string; p_token: string }
        Returns: boolean
      }
      validate_client_token: {
        Args: { p_token: string }
        Returns: {
          client_email: string
          client_id: string
          client_name: string
          client_user_id: string
          expires_at: string
          id: string
          is_valid: boolean
          project_id: string
          project_name: string
        }[]
      }
    }
    Enums: {
      comment_type: "comment" | "action_item" | "annotation" | "question"
      environment_type: "external" | "internal" | "both"
      model_type: "black_box" | "gray_box" | "white_box"
      notification_type:
        | "comment"
        | "retest_request"
        | "vulnerability"
        | "status_change"
      permission_type: "read" | "read_write" | "read_write_add"
      retest_status: "waiting" | "completed" | "no_retest"
      severity_type: "critical" | "high" | "medium" | "low" | "info"
      vuln_status:
        | "open"
        | "fixed"
        | "accepted"
        | "ignored"
        | "retest"
        | "false_positive"
        | "validated"
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
      comment_type: ["comment", "action_item", "annotation", "question"],
      environment_type: ["external", "internal", "both"],
      model_type: ["black_box", "gray_box", "white_box"],
      notification_type: [
        "comment",
        "retest_request",
        "vulnerability",
        "status_change",
      ],
      permission_type: ["read", "read_write", "read_write_add"],
      retest_status: ["waiting", "completed", "no_retest"],
      severity_type: ["critical", "high", "medium", "low", "info"],
      vuln_status: [
        "open",
        "fixed",
        "accepted",
        "ignored",
        "retest",
        "false_positive",
        "validated",
      ],
    },
  },
} as const
