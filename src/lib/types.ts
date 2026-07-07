export type ContactUitkomst = 'terugbellen' | 'deal' | 'geen_interesse';

export type CallUitkomst =
  | 'geen_bereik'
  | 'geen_gehoor'
  | 'voicemail'
  | 'testlink_verstuurd'
  | 'bel_later_terug'
  | 'deal'
  | 'geen_interesse';

export type LeadStatus =
  | 'nieuw'
  | 'contact_poging'
  | 'afgeboekt_geen_contact'
  | 'test_verzonden'
  | 'test_gestart'
  | 'test_afgerond';

export type OrderStatus =
  | 'offerte_aangemaakt'
  | 'offerte_verzonden'
  | 'ondertekend'
  | 'betaallink_verzonden'
  | 'betaald';

export type DeliveryStatus =
  | 'offerte'
  | 'aangemaakt'
  | 'in_progress'
  | 'verzonden'
  | 'aangekomen'
  | 'bedenktijd'
  | 'netto_sale'
  | 'cancelled';

export type TestResultType = 'toon' | 'spraak' | 'vraag';
export type Oor = 'links' | 'rechts' | 'beide';
export type Antwoord = 'gehoord' | 'niet_gehoord';

export interface Lead {
  id: string;
  naam: string;
  telefoon: string;
  email: string | null;
  test_token: string;
  status: LeadStatus;
  contact_pogingen: number;
  contact_uitkomst: ContactUitkomst | null;
  laatste_belpoging: string | null;
  created_at: string;
}

export interface CallLog {
  id: string;
  lead_id: string;
  uitkomst: CallUitkomst;
  telt_mee: boolean;
  notitie: string | null;
  created_at: string;
}

export interface TestResult {
  id: string;
  lead_id: string;
  stap_nummer: number;
  type: TestResultType;
  frequentie: number | null;
  oor: Oor | null;
  antwoord: Antwoord;
  created_at: string;
}

export interface Product {
  id: string;
  naam: string;
  model: string;
  beschrijving: string;
  listprijs: number;
  image_url: string | null;
  kenmerken: string;
  actief: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  order_nummer: number | null;
  lead_id: string;
  product_id: string | null;
  productnaam: string;
  product_model: string | null;
  product_beschrijving: string | null;
  product_image_url: string | null;
  product_kenmerken: string | null;
  listprijs: number;
  korting_bedrag: number;
  prijs: number;
  offerte_token: string;
  status: OrderStatus;
  delivery_status: DeliveryStatus;
  land: string;
  postcode: string | null;
  huisnummer: string | null;
  huisnummer_toevoeging: string | null;
  straat: string | null;
  plaats: string | null;
  provincie: string | null;
  ondertekend_door: string | null;
  ondertekend_op: string | null;
  signature_image: string | null;
  signed_offer_pdf: string | null;
  aangekomen_op: string | null;
  bedenktijd_dagen: number;
  netto_sale_op: string | null;
  cancelled_op: string | null;
  cancelled_from: DeliveryStatus | null;
  created_at: string;
}

export interface TestStep {
  stap: number;
  type: TestResultType;
  frequentie?: number;
  oor?: Oor;
  label: string;
}
