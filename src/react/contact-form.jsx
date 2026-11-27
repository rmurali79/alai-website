// Request a demo form (US-08). React is loaded on the Contact page only.
// The page holds a plain HTML form that posts straight to the form service,
// so it also works without JavaScript. This island takes over that form to
// add inline validation and an on-page confirmation.
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

const FIELDS = {
  name: { label: 'Your name', required: true, autoComplete: 'name' },
  email: { label: 'Work email', required: true, type: 'email', autoComplete: 'email' },
  company: { label: 'Organisation', required: true, autoComplete: 'organization' },
  country: { label: 'Country', required: true, options: ['Singapore', 'United States', 'India', 'Other'] },
  industry: {
    label: 'Industry',
    required: false,
    options: ['Ports', 'Public cleaning', 'Facility management', 'Waste management', 'Manufacturing', 'Infrastructure monitoring', 'Occupancy monitoring', 'Other'],
  },
  message: { label: 'What would you like to see or fix?', required: true, multiline: true },
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(name, value) {
  const f = FIELDS[name];
  const v = value.trim();
  if (f.required && !v) return `Please enter ${f.label.toLowerCase()}.`;
  if (name === 'email' && v && !EMAIL.test(v)) return 'Please enter an email address like name@company.com.';
  if (name === 'message' && v && v.length < 10) return 'Please add a little more detail (at least 10 characters).';
  return '';
}

function ContactForm({ mount, replyTime }) {
  const [values, setValues] = useState(() => Object.fromEntries(Object.keys(FIELDS).map((k) => [k, ''])));
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [status, setStatus] = useState('idle'); // idle | sending | sent | failed
  const trap = useRef(null);
  const summary = useRef(null);
  const done = useRef(null);

  // Move focus to the confirmation or the error once it has rendered.
  useEffect(() => {
    if (status === 'sent') done.current?.focus();
    if (status === 'failed') summary.current?.focus();
  }, [status]);

  const update = (name, value) => {
    setValues((s) => ({ ...s, [name]: value }));
    if (touched[name]) setErrors((e) => ({ ...e, [name]: validate(name, value) }));
  };
  const blur = (name) => {
    setTouched((t) => ({ ...t, [name]: true }));
    setErrors((e) => ({ ...e, [name]: validate(name, values[name]) }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const found = Object.fromEntries(Object.keys(FIELDS).map((k) => [k, validate(k, values[k])]));
    setErrors(found);
    setTouched(Object.fromEntries(Object.keys(FIELDS).map((k) => [k, true])));
    const first = Object.keys(found).find((k) => found[k]);
    if (first) {
      document.getElementById(`cf-${first}`)?.focus();
      return;
    }
    const endpoint = mount.dataset.endpoint || '';
    if (!endpoint) {
      setStatus('failed');
      return;
    }
    setStatus('sending');
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...values, _gotcha: trap.current?.value ?? '' }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus('sent');
    } catch {
      setStatus('failed');
    }
  };

  if (status === 'sent') {
    return (
      <div className="form-done" tabIndex={-1} ref={done}>
        <h2>Thank you, we have your request</h2>
        <p>
          We will reply to {values.email} {replyTime ? `within ${replyTime}` : 'soon'} to agree a time for your demo.
        </p>
        <p>If it is urgent, email <a href="mailto:info@alai-labs.com">info@alai-labs.com</a>.</p>
      </div>
    );
  }

  return (
    <form className="demo-form" noValidate onSubmit={submit}>
      {status === 'failed' && (
        <div className="form-error" role="alert" tabIndex={-1} ref={summary}>
          {mount.dataset.endpoint
            ? 'Your request could not be sent. Please try again, or email info@alai-labs.com.'
            : 'This form is not connected yet. Please email info@alai-labs.com and we will reply.'}
        </div>
      )}
      {Object.entries(FIELDS).map(([name, f]) => {
        const id = `cf-${name}`;
        const err = touched[name] && errors[name];
        const common = {
          id,
          name,
          value: values[name],
          required: f.required,
          'aria-invalid': err ? 'true' : undefined,
          'aria-describedby': err ? `${id}-error` : undefined,
          onChange: (e) => update(name, e.target.value),
          onBlur: () => blur(name),
        };
        return (
          <div className="field" key={name}>
            <label htmlFor={id}>
              {f.label}
              {!f.required && <span className="optional"> (optional)</span>}
            </label>
            {f.options ? (
              <select {...common}>
                <option value="">Choose one</option>
                {f.options.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            ) : f.multiline ? (
              <textarea rows={5} {...common} />
            ) : (
              <input type={f.type ?? 'text'} autoComplete={f.autoComplete} {...common} />
            )}
            {err && (
              <p className="field-error" id={`${id}-error`}>
                {err}
              </p>
            )}
          </div>
        );
      })}
      <div className="trap" aria-hidden="true">
        <label htmlFor="cf-gotcha">Leave this empty</label>
        <input id="cf-gotcha" name="_gotcha" tabIndex={-1} autoComplete="off" ref={trap} />
      </div>
      <p className="form-note">
        We use these details only to reply to you. See our <a href="/privacy/">privacy notice</a>.
      </p>
      <button className="button" type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending…' : 'Request a demo'}
      </button>
    </form>
  );
}

const mount = document.getElementById('contact-form');
if (mount) {
  const replyTime = mount.dataset.replyTime || '';
  createRoot(mount).render(<ContactForm mount={mount} replyTime={replyTime} />);
}
