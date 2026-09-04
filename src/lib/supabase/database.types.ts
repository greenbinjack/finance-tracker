// Hand-written to match supabase/schema.sql.
// If you later run `supabase gen types typescript`, you can replace this file with the generated one.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type TransactionType = "expense" | "income";
/** transactions.type is wider than TransactionType — categories/scheduled items are never "transfer". */
export type TransactionKind = TransactionType | "transfer";
export type AccountType = "cash" | "bank" | "card" | "mobile_wallet" | "brokerage" | "other";
export type InvestmentType = string;
export type LoanDirection = "given" | "taken";
export type LoanStatus = "open" | "partly_paid" | "settled";
export type ItineraryItemType = "activity" | "flight" | "hotel" | "transport" | "other";

interface Relationship {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
}

type Table<Row, Insert, Relationships extends Relationship[] = [], Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Relationships;
};

export interface Database {
  public: {
    Tables: {
      profiles: Table<
        { id: string; display_name: string | null; currency: string; created_at: string },
        { id: string; display_name?: string | null; currency?: string; created_at?: string }
      >;
      accounts: Table<
        {
          id: string;
          user_id: string;
          name: string;
          account_type: AccountType;
          institution_name: string | null;
          account_number: string | null;
          card_number: string | null;
          branch_name: string | null;
          branch_address: string | null;
          opening_balance: number;
          sort_order: number;
          is_primary: boolean;
          created_at: string;
        },
        {
          id?: string;
          user_id: string;
          name: string;
          account_type?: AccountType;
          institution_name?: string | null;
          account_number?: string | null;
          card_number?: string | null;
          branch_name?: string | null;
          branch_address?: string | null;
          opening_balance?: number;
          sort_order?: number;
          is_primary?: boolean;
          created_at?: string;
        }
      >;
      categories: Table<
        { id: string; user_id: string; name: string; type: TransactionType; icon: string | null; created_at: string },
        { id?: string; user_id: string; name: string; type: TransactionType; icon?: string | null; created_at?: string }
      >;
      events: Table<
        {
          id: string;
          user_id: string;
          name: string;
          budget_amount: number | null;
          start_date: string | null;
          end_date: string | null;
          notes: string | null;
          share_token: string | null;
          created_at: string;
        },
        {
          id?: string;
          user_id: string;
          name: string;
          budget_amount?: number | null;
          start_date?: string | null;
          end_date?: string | null;
          notes?: string | null;
          share_token?: string | null;
          created_at?: string;
        }
      >;
      event_itinerary_items: Table<
        {
          id: string;
          event_id: string;
          user_id: string;
          day_date: string;
          time: string | null;
          title: string;
          notes: string | null;
          location: string | null;
          item_type: ItineraryItemType;
          confirmation_number: string | null;
          created_at: string;
        },
        {
          id?: string;
          event_id: string;
          user_id: string;
          day_date: string;
          time?: string | null;
          title: string;
          notes?: string | null;
          location?: string | null;
          item_type?: ItineraryItemType;
          confirmation_number?: string | null;
          created_at?: string;
        },
        [
          {
            foreignKeyName: "event_itinerary_items_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ]
      >;
      event_checklist_items: Table<
        { id: string; event_id: string; user_id: string; text: string; is_done: boolean; created_at: string },
        {
          id?: string;
          event_id: string;
          user_id: string;
          text: string;
          is_done?: boolean;
          created_at?: string;
        },
        [
          {
            foreignKeyName: "event_checklist_items_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ]
      >;
      event_participants: Table<
        { id: string; event_id: string; user_id: string; name: string; created_at: string },
        { id?: string; event_id: string; user_id: string; name: string; created_at?: string },
        [
          {
            foreignKeyName: "event_participants_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ]
      >;
      participant_settlements: Table<
        {
          id: string;
          event_id: string;
          user_id: string;
          from_participant_id: string | null;
          to_participant_id: string | null;
          amount: number;
          settled_on: string;
          transaction_id: string | null;
          notes: string | null;
          created_at: string;
        },
        {
          id?: string;
          event_id: string;
          user_id: string;
          from_participant_id?: string | null;
          to_participant_id?: string | null;
          amount: number;
          settled_on?: string;
          transaction_id?: string | null;
          notes?: string | null;
          created_at?: string;
        },
        [
          {
            foreignKeyName: "participant_settlements_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "participant_settlements_from_participant_id_fkey";
            columns: ["from_participant_id"];
            isOneToOne: false;
            referencedRelation: "event_participants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "participant_settlements_to_participant_id_fkey";
            columns: ["to_participant_id"];
            isOneToOne: false;
            referencedRelation: "event_participants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "participant_settlements_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          },
        ]
      >;
      transactions: Table<
        {
          id: string;
          user_id: string;
          type: TransactionKind;
          amount: number;
          category_id: string | null;
          account_id: string | null;
          to_account_id: string | null;
          event_id: string | null;
          occurred_on: string;
          note: string | null;
          paid_by_participant_id: string | null;
          in_personal_history: boolean;
          scheduled_item_id: string | null;
          is_external: boolean;
          receipt_path: string | null;
          created_at: string;
        },
        {
          id?: string;
          user_id: string;
          type: TransactionKind;
          amount: number;
          category_id?: string | null;
          account_id?: string | null;
          to_account_id?: string | null;
          event_id?: string | null;
          occurred_on?: string;
          note?: string | null;
          paid_by_participant_id?: string | null;
          in_personal_history?: boolean;
          scheduled_item_id?: string | null;
          is_external?: boolean;
          receipt_path?: string | null;
          created_at?: string;
        },
        [
          {
            foreignKeyName: "transactions_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_to_account_id_fkey";
            columns: ["to_account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_paid_by_participant_id_fkey";
            columns: ["paid_by_participant_id"];
            isOneToOne: false;
            referencedRelation: "event_participants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_scheduled_item_id_fkey";
            columns: ["scheduled_item_id"];
            isOneToOne: false;
            referencedRelation: "event_scheduled_items";
            referencedColumns: ["id"];
          },
        ]
      >;
      event_scheduled_items: Table<
        {
          id: string;
          event_id: string;
          user_id: string;
          type: TransactionType;
          amount: number;
          note: string | null;
          created_at: string;
        },
        {
          id?: string;
          event_id: string;
          user_id: string;
          type: TransactionType;
          amount: number;
          note?: string | null;
          created_at?: string;
        },
        [
          {
            foreignKeyName: "event_scheduled_items_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ]
      >;
      investments: Table<
        {
          id: string;
          user_id: string;
          name: string;
          type: InvestmentType;
          amount_invested: number;
          current_value: number;
          date_invested: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id: string;
          name: string;
          type: InvestmentType;
          amount_invested: number;
          current_value: number;
          date_invested?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      loans: Table<
        {
          id: string;
          user_id: string;
          person_name: string;
          direction: LoanDirection;
          principal_amount: number;
          date_of_loan: string;
          due_date: string | null;
          status: LoanStatus;
          notes: string | null;
          interest_rate: number | null;
          created_at: string;
        },
        {
          id?: string;
          user_id: string;
          person_name: string;
          direction: LoanDirection;
          principal_amount: number;
          date_of_loan?: string;
          due_date?: string | null;
          status?: LoanStatus;
          notes?: string | null;
          interest_rate?: number | null;
          created_at?: string;
        }
      >;
      loan_payments: Table<
        {
          id: string;
          loan_id: string;
          user_id: string;
          amount: number;
          paid_on: string;
          notes: string | null;
          created_at: string;
        },
        {
          id?: string;
          loan_id: string;
          user_id: string;
          amount: number;
          paid_on?: string;
          notes?: string | null;
          created_at?: string;
        },
        [
          {
            foreignKeyName: "loan_payments_loan_id_fkey";
            columns: ["loan_id"];
            isOneToOne: false;
            referencedRelation: "loans";
            referencedColumns: ["id"];
          },
        ]
      >;
      budgets: Table<
        { id: string; user_id: string; category_id: string; month: string; cap_amount: number; created_at: string },
        { id?: string; user_id: string; category_id: string; month: string; cap_amount: number; created_at?: string },
        [
          {
            foreignKeyName: "budgets_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ]
      >;
      transaction_splits: Table<
        {
          id: string;
          transaction_id: string;
          user_id: string;
          participant_id: string | null;
          share_amount: number;
          created_at: string;
        },
        {
          id?: string;
          transaction_id: string;
          user_id: string;
          participant_id?: string | null;
          share_amount: number;
          created_at?: string;
        },
        [
          {
            foreignKeyName: "transaction_splits_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transaction_splits_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "event_participants";
            referencedColumns: ["id"];
          },
        ]
      >;
    };
    Views: Record<string, never>;
    Functions: {
      seed_default_categories: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
      get_event_detail: {
        Args: { p_event_id: string };
        Returns: Json;
      };
      delete_own_account: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      get_shared_trip: {
        Args: { p_token: string };
        Returns: Json;
      };
      get_dashboard_data: {
        Args: { p_month_start: string; p_month_end: string };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
