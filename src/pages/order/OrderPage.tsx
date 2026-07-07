import { useEffect, useState, type FormEvent, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { CustomerLayout } from '../../components/CustomerLayout';
import { CheckAnimation } from '../../components/CheckAnimation';
import { SignaturePad } from '../../components/SignaturePad';
import { Logo } from '../../components/Logo';
import { OfferHearingAnalysis } from '../../components/OfferHearingAnalysis';
import { fetchOrderByToken, fetchLeadById, fetchTestResults, signOrder } from '../../lib/db';
import { lookupAddress } from '../../lib/postcodeApi';
import { generateSignedOfferPdf } from '../../lib/offerPdf';
import { formatEuro } from '../../lib/pricing';
import { parseKenmerken, PLACEHOLDER_PRODUCT_IMAGE } from '../../lib/productUtils';
import type { Lead, Order, TestResult } from '../../lib/types';

function isValidPostcode(pc: string): boolean {
  return /^\d{4}[A-Za-z]{2}$/.test(pc.replace(/\s/g, ''));
}

export function OrderPage() {
  const { token } = useParams<{ token: string }>();
  const [lead, setLead] = useState<Lead | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [signed, setSigned] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [addressError, setAddressError] = useState('');

  const [postcode, setPostcode] = useState('');
  const [huisnummer, setHuisnummer] = useState('');
  const [toevoeging, setToevoeging] = useState('');
  const [straat, setStraat] = useState('');
  const [plaats, setPlaats] = useState('');
  const [provincie, setProvincie] = useState('');
  const [land, setLand] = useState('Nederland');
  const [lookupLoading, setLookupLoading] = useState(false);

  const lastLookupKey = useRef('');

  const runAddressLookup = useCallback(async (pc: string, nr: string, toev: string) => {
    const normalizedPc = pc.replace(/\s/g, '').toUpperCase();
    const key = `${normalizedPc}|${nr}|${toev}`;
    if (key === lastLookupKey.current) return;
    if (!isValidPostcode(normalizedPc) || !nr.trim()) return;

    lastLookupKey.current = key;
    setLookupLoading(true);
    setAddressError('');
    try {
      const result = await lookupAddress(normalizedPc, nr, toev || undefined);
      setStraat(result.street);
      setPlaats(result.city);
      setProvincie(result.province);
      setPostcode(result.zip_code);
      setLand('Nederland');
    } catch (err) {
      lastLookupKey.current = '';
      setAddressError(err instanceof Error ? err.message : 'Adres niet gevonden.');
      setStraat('');
      setPlaats('');
      setProvincie('');
    } finally {
      setLookupLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    async function loadOrder() {
      const { data: orderData } = await fetchOrderByToken(token!);
      if (!orderData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const [leadRes, resultsRes] = await Promise.all([
        fetchLeadById(orderData.lead_id),
        fetchTestResults(orderData.lead_id),
      ]);

      setOrder(orderData);
      setLead(
        leadRes.data ?? {
          id: orderData.lead_id,
          naam: 'Klant',
          telefoon: '',
          email: null,
          test_token: '',
          status: 'test_afgerond',
          contact_pogingen: 0,
          contact_uitkomst: null,
          laatste_belpoging: null,
          created_at: orderData.created_at,
        }
      );
      setTestResults(resultsRes.data ?? []);
      setSignatureName(leadRes.data?.naam ?? '');
      if (
        orderData.status === 'ondertekend' ||
        orderData.status === 'betaallink_verzonden' ||
        orderData.status === 'betaald'
      ) {
        setSigned(true);
      }
      if (orderData.postcode) setPostcode(orderData.postcode);
      if (orderData.huisnummer) setHuisnummer(orderData.huisnummer);
      if (orderData.huisnummer_toevoeging) setToevoeging(orderData.huisnummer_toevoeging);
      if (orderData.straat) setStraat(orderData.straat);
      if (orderData.plaats) setPlaats(orderData.plaats);
      if (orderData.provincie) setProvincie(orderData.provincie);
      if (orderData.land) setLand(orderData.land);
      setLoading(false);
    }

    loadOrder();
  }, [token]);

  useEffect(() => {
    const timer = setTimeout(() => {
      runAddressLookup(postcode, huisnummer, toevoeging);
    }, 500);
    return () => clearTimeout(timer);
  }, [postcode, huisnummer, toevoeging, runAddressLookup]);

  const handleSign = async (e: FormEvent) => {
    e.preventDefault();
    if (!order || !lead || !signatureName.trim() || !agreed) return;
    if (!signatureImage) {
      setAddressError('Teken uw handtekening in het veld hieronder.');
      return;
    }
    if (!straat.trim() || !plaats.trim()) {
      setAddressError('Vul postcode en huisnummer in — het adres wordt automatisch ingevuld.');
      return;
    }

    setSubmitting(true);
    setAddressError('');

    const signedOrder: Order = {
      ...order,
      ondertekend_door: signatureName.trim(),
      ondertekend_op: new Date().toISOString(),
      signature_image: signatureImage,
      land,
      postcode: postcode.replace(/\s/g, '').toUpperCase(),
      huisnummer,
      huisnummer_toevoeging: toevoeging || null,
      straat,
      plaats,
      provincie,
    };

    const pdf = generateSignedOfferPdf(lead, signedOrder, testResults);

    await signOrder(order.id, {
      ondertekend_door: signatureName.trim(),
      land,
      postcode: postcode.replace(/\s/g, '').toUpperCase(),
      huisnummer,
      huisnummer_toevoeging: toevoeging || null,
      straat,
      plaats,
      provincie,
      signed_offer_pdf: pdf,
      signature_image: signatureImage,
    });

    setSigned(true);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <CustomerLayout>
        <p style={{ textAlign: 'center' }}>Laden...</p>
      </CustomerLayout>
    );
  }

  if (notFound || !order || !lead) {
    return (
      <CustomerLayout>
        <div className="error-page">
          <h1>Offerte niet gevonden</h1>
          <p>Deze offertelink is ongeldig of verlopen. Neem contact op met HearDirect.</p>
        </div>
      </CustomerLayout>
    );
  }

  if (signed) {
    return (
      <CustomerLayout>
        <div className="card card-lg" style={{ textAlign: 'center' }}>
          <CheckAnimation />
          <h1 className="completion-title">Bedankt {lead.naam}</h1>
          <p className="completion-text">
            Uw order is aangemaakt. U ontvangt zo de betaallink per e-mail/SMS.
          </p>
        </div>
      </CustomerLayout>
    );
  }

  const imageUrl = order.product_image_url || PLACEHOLDER_PRODUCT_IMAGE;
  const kenmerken = parseKenmerken(order.product_kenmerken);
  const hasDiscount = order.korting_bedrag > 0;

  return (
    <CustomerLayout wide>
      <div className="contract-reader">
        <div className="contract-page">
          <header className="contract-header">
            <Logo size="sm" />
            <div className="contract-meta">
              <span>Offerte — pagina 1</span>
              <span>{new Date(order.created_at).toLocaleDateString('nl-NL')}</span>
            </div>
          </header>

          <p className="contract-salutation">Geachte {lead.naam},</p>
          <p className="contract-intro">
            Hierbij ontvangt u onze persoonlijke offerte op basis van uw hoortest. Lees beide pagina&apos;s
            door en onderteken digitaal onderaan.
          </p>

          <section className="contract-product-card">
            <img src={imageUrl} alt={order.productnaam} className="contract-product-image" />
            <div className="contract-product-info">
              <h1 className="contract-product-title">{order.productnaam}</h1>
              {order.product_model && (
                <p className="contract-product-model">Model {order.product_model}</p>
              )}
              {order.product_beschrijving && (
                <p className="contract-product-desc">{order.product_beschrijving}</p>
              )}
            </div>
          </section>

          {kenmerken.length > 0 && (
            <ul className="order-includes contract-includes">
              {kenmerken.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}

          <table className="contract-price-table">
            <tbody>
              <tr>
                <td>Listprijs</td>
                <td className="contract-price-val">{formatEuro(order.listprijs)}</td>
              </tr>
              {hasDiscount && (
                <tr className="contract-discount-row">
                  <td>Korting</td>
                  <td className="contract-price-val">− {formatEuro(order.korting_bedrag)}</td>
                </tr>
              )}
              <tr className="contract-total-row">
                <td><strong>Totaal te betalen</strong></td>
                <td className="contract-price-val contract-total-price">{formatEuro(order.prijs)}</td>
              </tr>
            </tbody>
          </table>

          <div className="legal-text contract-legal">
            U heeft 14 dagen herroepingsrecht vanaf ontvangst van het product. Tijdens de bedenktijd
            kunt u het product kosteloos retourneren voor volledige terugbetaling. Deze online
            hoortest is geen medische diagnose.
          </div>
        </div>

        <div className="contract-page contract-page-2">
          <header className="contract-header">
            <Logo size="sm" />
            <div className="contract-meta">
              <span>Offerte — pagina 2</span>
              <span>Hoortestresultaten</span>
            </div>
          </header>

          <h2 className="contract-section-title">Uw hoortestresultaten</h2>

          <OfferHearingAnalysis results={testResults} leadName={lead.naam} />

          <form onSubmit={handleSign} className="contract-form">
            <h2 className="contract-section-title">Afleveradres</h2>
            <p className="contract-sign-hint">
              Vul postcode en huisnummer in — straat, plaats en provincie worden automatisch ingevuld.
            </p>

            <div className="address-row contract-address-row">
              <div className="form-group contract-field-postcode">
                <label htmlFor="postcode">Postcode</label>
                <input
                  id="postcode"
                  className="form-input contract-input"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                  placeholder="1234AB"
                  autoComplete="postal-code"
                />
              </div>
              <div className="form-group contract-field-nr">
                <label htmlFor="huisnummer">Nr.</label>
                <input
                  id="huisnummer"
                  className="form-input contract-input"
                  value={huisnummer}
                  onChange={(e) => setHuisnummer(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="form-group contract-field-toev">
                <label htmlFor="toevoeging">Toev.</label>
                <input
                  id="toevoeging"
                  className="form-input contract-input"
                  value={toevoeging}
                  onChange={(e) => setToevoeging(e.target.value)}
                />
              </div>
            </div>

            {lookupLoading && (
              <p className="contract-lookup-hint">Adres opzoeken...</p>
            )}

            {addressError && <p className="contract-error">{addressError}</p>}

            <div className="form-group">
              <label htmlFor="straat">Straat</label>
              <input id="straat" className="form-input contract-input" value={straat} readOnly />
            </div>
            <div className="address-row contract-address-row">
              <div className="form-group">
                <label htmlFor="plaats">Plaats</label>
                <input id="plaats" className="form-input contract-input" value={plaats} readOnly />
              </div>
              <div className="form-group">
                <label htmlFor="provincie">Provincie</label>
                <input id="provincie" className="form-input contract-input" value={provincie} readOnly />
              </div>
            </div>

            <h2 className="contract-section-title">Ondertekening</h2>
            <p className="contract-sign-hint">
              Door hieronder te tekenen gaat u akkoord met deze offerte en de algemene voorwaarden.
            </p>

            <div className="form-group">
              <label htmlFor="signature-name">Volledige naam</label>
              <input
                id="signature-name"
                className="form-input contract-input contract-name-input"
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
              />
            </div>

            <SignaturePad onChange={setSignatureImage} disabled={submitting} />

            <div className="checkbox-group contract-checkbox">
              <input id="agree" type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
              <label htmlFor="agree">Ik ga akkoord met de offerte en voorwaarden</label>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg contract-submit"
              disabled={!signatureName.trim() || !agreed || !straat || !signatureImage || submitting}
            >
              {submitting ? 'Bevestigen...' : 'Onderteken en bevestig'}
            </button>
          </form>
        </div>
      </div>
    </CustomerLayout>
  );
}
