import { useState } from "react";
import { useAuth } from "../../state/AuthContext";

/** base64url, as JWTs use it, back to text. */
function decodePart(part: string): string {
  const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const json = decodeURIComponent(
    Array.from(atob(padded), (c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join(""),
  );
  return JSON.stringify(JSON.parse(json), null, 2);
}

/**
 * Splits the ID token at its two dots and decodes the header and payload in
 * the browser. Nothing is sent anywhere. A debugging aid; remove it from a
 * production build.
 */
export function TokenPeek() {
  const { service } = useAuth();
  const [parts, setParts] = useState<string[] | null>(null);

  async function reveal() {
    const token = await service.getIdToken();
    setParts(token ? token.split(".") : null);
  }

  if (!parts) {
    return (
      <button type="button" className="link" onClick={reveal}>
        What is in my token?
      </button>
    );
  }

  let header = "";
  let payload = "";
  try {
    header = decodePart(parts[0]);
    payload = decodePart(parts[1]);
  } catch {
    header = "(not a JWT)";
  }

  return (
    <div className="token-peek">
      <p className="token-peek__raw">
        <span className="jwt-header">{parts[0]}</span>.
        <span className="jwt-payload">{parts[1]}</span>.
        <span className="jwt-signature">{parts[2]}</span>
      </p>
      <div className="token-peek__decoded">
        <div>
          <h4 className="jwt-header">Header: which algorithm, which key</h4>
          <pre>{header}</pre>
        </div>
        <div>
          <h4 className="jwt-payload">Payload: the claims</h4>
          <pre>{payload}</pre>
        </div>
        <div>
          <h4 className="jwt-signature">Signature</h4>
          <p>
            Made with Google&apos;s private key. Our server checks it with
            Google&apos;s public key, and cannot make one of its own.
          </p>
        </div>
      </div>
      <button type="button" className="link" onClick={() => setParts(null)}>
        Hide
      </button>
    </div>
  );
}
