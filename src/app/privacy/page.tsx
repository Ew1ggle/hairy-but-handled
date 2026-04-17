"use client";

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <img src="/logo-box.png" alt="" className="h-12 w-auto" />
        <div className="brand-font">
          <div className="text-xl font-semibold">Hairy but Handled</div>
          <div className="text-xs text-[var(--ink-soft)] uppercase tracking-widest">Privacy Policy</div>
        </div>
      </div>

      <div className="prose prose-sm max-w-none text-[var(--ink)] space-y-6">
        <p className="text-xs text-[var(--ink-soft)]">Last updated: 17 April 2026 | Version 1.0</p>

        <section>
          <h2 className="text-lg font-bold mt-6 mb-2">1. Who we are</h2>
          <p>
            Hairy but Handled (&quot;the App&quot;, &quot;we&quot;, &quot;us&quot;) is a cancer patient care tracking application.
            The App is operated from Queensland, Australia.
          </p>
          <p>
            For privacy enquiries, contact: <a href="mailto:hairybuthandled@gmail.com" className="text-[var(--primary)]">hairybuthandled@gmail.com</a>
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mt-6 mb-2">2. What information we collect</h2>
          <p>We collect the following types of personal information:</p>

          <h3 className="font-semibold mt-3">Identity and contact information</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Name, date of birth, email address</li>
            <li>Gender identity and sex at birth</li>
          </ul>

          <h3 className="font-semibold mt-3">Government identifiers</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Medicare number and position (optional — stored to assist with appointments)</li>
            <li>Private health fund details (optional)</li>
          </ul>

          <h3 className="font-semibold mt-3">Health information (sensitive information)</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Cancer diagnosis, subtype, and BRAF mutation status</li>
            <li>Treatment regimen, infusion schedule, and medication details</li>
            <li>Blood test results (haemoglobin, white cells, neutrophils, platelets, etc.)</li>
            <li>Daily symptom logs: temperature, fatigue, pain, nausea, mood, sleep, and red flags</li>
            <li>Side effects experienced</li>
            <li>Hospital admissions and emergency department visits</li>
            <li>Allergies and medical history</li>
            <li>Baseline vital signs (weight, height, blood pressure, heart rate)</li>
            <li>Advance care directive preferences and values</li>
            <li>Uploaded medical reports, photos, and PDF documents</li>
          </ul>

          <h3 className="font-semibold mt-3">Care circle information</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Names, phone numbers, and email addresses of support people</li>
            <li>Enduring Power of Attorney (EPOA) designation</li>
            <li>Treating practitioners: names, clinics, and contact details</li>
          </ul>

          <h3 className="font-semibold mt-3">Technical information</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Email address used for authentication</li>
            <li>Consent records and timestamps</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold mt-6 mb-2">3. How we collect information</h2>
          <p>We collect information directly from you when you:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Create an account and sign in</li>
            <li>Complete your patient profile</li>
            <li>Log daily symptoms, blood results, medications, or ED visits</li>
            <li>Upload medical reports or photos</li>
            <li>Invite support people or doctors to your care circle</li>
          </ul>
          <p className="mt-2">
            If you are a support person or doctor, the patient who invited you has provided your email address to enable
            your access. You will receive an invitation email explaining this.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mt-6 mb-2">4. Why we collect information</h2>
          <p>We collect and use your personal information to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Track your cancer treatment, symptoms, and side effects over time</li>
            <li>Generate clinical summaries for your care team</li>
            <li>Alert you to potential red flags requiring medical attention</li>
            <li>Enable your care circle (support people, doctors) to view and contribute to your care record</li>
            <li>Provide your information at hospital appointments and emergency visits</li>
            <li>Store medical reports and documents for easy reference</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold mt-6 mb-2">5. Who we share information with</h2>
          <p>Your health data is shared only with:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Your care circle</strong> — the support people and doctors you explicitly invite. You control who is in your care circle and can remove anyone at any time via Settings.</li>
            <li><strong>Cloud service providers</strong> — see section 7 below.</li>
          </ul>
          <p className="mt-2">
            We do not sell, rent, or otherwise disclose your personal information to any third parties for marketing or
            any purpose other than operating the App.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mt-6 mb-2">6. Consent</h2>
          <p>
            Because we collect sensitive health information, we require your explicit consent before any data is entered.
            You are asked to consent when you first use the App, covering:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Collection and storage of your health and personal information</li>
            <li>Sharing with your care circle</li>
            <li>Processing by US-headquartered cloud providers (with data stored in Australia)</li>
          </ul>
          <p className="mt-2">
            You can withdraw consent at any time by deleting your account in Settings. This will permanently delete
            all your data.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mt-6 mb-2">7. Where your data is stored (overseas disclosure)</h2>
          <p>Your data is stored and processed using the following infrastructure:</p>
          <div className="overflow-auto mt-2">
            <table className="w-full text-sm border-collapse border border-[var(--border)]">
              <thead>
                <tr className="bg-[var(--surface-soft)]">
                  <th className="text-left p-2 border border-[var(--border)]">Service</th>
                  <th className="text-left p-2 border border-[var(--border)]">Company HQ</th>
                  <th className="text-left p-2 border border-[var(--border)]">Data location</th>
                  <th className="text-left p-2 border border-[var(--border)]">What it stores</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2 border border-[var(--border)]">Supabase (database)</td>
                  <td className="p-2 border border-[var(--border)]">USA</td>
                  <td className="p-2 border border-[var(--border)]">AWS Sydney (ap-southeast-2)</td>
                  <td className="p-2 border border-[var(--border)]">All patient data, profiles, auth</td>
                </tr>
                <tr>
                  <td className="p-2 border border-[var(--border)]">Supabase (file storage)</td>
                  <td className="p-2 border border-[var(--border)]">USA</td>
                  <td className="p-2 border border-[var(--border)]">AWS Sydney (ap-southeast-2)</td>
                  <td className="p-2 border border-[var(--border)]">Uploaded reports and photos</td>
                </tr>
                <tr>
                  <td className="p-2 border border-[var(--border)]">Vercel (app hosting)</td>
                  <td className="p-2 border border-[var(--border)]">USA</td>
                  <td className="p-2 border border-[var(--border)]">Sydney (syd1)</td>
                  <td className="p-2 border border-[var(--border)]">Application code, API routes</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2">
            While your data is stored in Australia, Supabase Inc. and Vercel Inc. are US-headquartered companies
            and may be subject to US government data access requests under the CLOUD Act. We have disclosed this
            to you and obtained your consent for this cross-border processing arrangement.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mt-6 mb-2">8. How we protect your data</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>All data is encrypted in transit (TLS/HTTPS)</li>
            <li>All data is encrypted at rest (AWS server-side encryption)</li>
            <li>Database access is controlled by Row Level Security — each user can only access data they are authorised to see</li>
            <li>Uploaded files are stored in a private bucket with signed, time-limited URLs</li>
            <li>Authentication uses secure magic link (OTP) — no passwords are stored</li>
            <li>The App does not store any data on your device beyond a session token</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold mt-6 mb-2">9. Accessing and correcting your information</h2>
          <p>
            You can view all your data within the App at any time. You can edit your profile, update entries,
            and delete records. You can export a clinical summary as a PDF.
          </p>
          <p className="mt-2">
            If you would like a copy of all data held about you, or if you believe your information is inaccurate
            and cannot correct it yourself, contact us at <a href="mailto:hairybuthandled@gmail.com" className="text-[var(--primary)]">hairybuthandled@gmail.com</a>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mt-6 mb-2">10. Deleting your data</h2>
          <p>
            You can delete your account and all associated data at any time via Settings. This action is permanent
            and cannot be undone. All entries, profile data, uploaded files, and membership records will be permanently deleted.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mt-6 mb-2">11. Data breaches</h2>
          <p>
            In the event of a data breach that is likely to result in serious harm, we will notify the
            Office of the Australian Information Commissioner (OAIC) and affected individuals as required
            under Part IIIC of the Privacy Act 1988 (Cth).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mt-6 mb-2">12. Complaints</h2>
          <p>
            If you believe we have breached the Australian Privacy Principles, you can:
          </p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Contact us at <a href="mailto:hairybuthandled@gmail.com" className="text-[var(--primary)]">hairybuthandled@gmail.com</a> — we will respond within 30 days</li>
            <li>If unsatisfied, lodge a complaint with the Office of the Australian Information Commissioner (OAIC) at <a href="https://www.oaic.gov.au" target="_blank" rel="noopener noreferrer" className="text-[var(--primary)]">oaic.gov.au</a></li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-bold mt-6 mb-2">13. Changes to this policy</h2>
          <p>
            We may update this privacy policy from time to time. If we make material changes, we will notify you
            within the App and may require you to re-consent. The current version and date are shown at the top of this page.
          </p>
        </section>

        <div className="mt-8 pt-4 border-t border-[var(--border)] text-xs text-[var(--ink-soft)]">
          <p>This privacy policy is governed by the laws of Queensland, Australia, and the Privacy Act 1988 (Cth).</p>
          <p className="mt-2">
            <a href="/" className="text-[var(--primary)]">← Back to the app</a>
          </p>
        </div>
      </div>
    </div>
  );
}
