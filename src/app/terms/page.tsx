"use client";

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <img src="/logo-box.png" alt="" className="h-12 w-auto" />
        <div className="brand-font">
          <div className="text-xl font-semibold">Hairy but Handled</div>
          <div className="text-xs text-[var(--ink-soft)] uppercase tracking-widest">Terms of Service</div>
        </div>
      </div>

      <div className="prose prose-sm max-w-none text-[var(--ink)] space-y-6">
        <p className="text-xs text-[var(--ink-soft)]">Last updated: 17 April 2026 | Version 1.0</p>

        <section>
          <h2 className="text-lg font-bold mt-6 mb-2">1. About the App</h2>
          <p>
            Hairy but Handled (&quot;the App&quot;) is a personal cancer care tracking tool that helps patients
            and their support circle log symptoms, track treatment, and prepare for medical appointments.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mt-6 mb-2">2. Not medical advice</h2>
          <p className="font-semibold text-[var(--alert)]">
            This App does not provide medical advice, diagnosis, or treatment.
          </p>
          <p>
            The information in this App — including the side-effect finder, red flag indicators, and daily
            activity suggestions — is for informational and tracking purposes only. It is not a substitute
            for professional medical advice, diagnosis, or treatment.
          </p>
          <p className="mt-2">
            Always seek the advice of your qualified health provider with any questions you may have regarding
            a medical condition. Never disregard professional medical advice or delay in seeking it because of
            something you have read or tracked in this App.
          </p>
          <p className="mt-2">
            If you are experiencing a medical emergency, call 000 (Australia) or go to your nearest emergency department immediately.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mt-6 mb-2">3. Not a My Health Record</h2>
          <p>
            This App is not part of, affiliated with, or a substitute for the Australian Government&apos;s
            My Health Record system. Data entered in this App is not shared with My Health Record and is not
            accessible by Medicare, the PBS, or any government agency.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mt-6 mb-2">4. Your responsibilities</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>You are responsible for the accuracy of information you enter</li>
            <li>You must not share your login credentials with anyone else</li>
            <li>You are responsible for choosing who to invite to your care circle</li>
            <li>If you invite a support person, they will be able to view and edit your health data — ensure you trust them</li>
            <li>You should not enter personal information about third parties (other than care circle members) without their knowledge</li>
            <li>You should keep your email address up to date as it is used for authentication</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold mt-6 mb-2">5. Care circle</h2>
          <p>
            The care circle feature allows you to invite support people and doctors to view your health record.
            Support people can also add entries on your behalf.
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>You control who is in your care circle at all times</li>
            <li>You can remove anyone from your care circle via Settings</li>
            <li>Doctors have read-only access</li>
            <li>Support people can log entries, but cannot delete records or remove other members</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold mt-6 mb-2">6. Data and privacy</h2>
          <p>
            Your use of the App is subject to our <a href="/privacy" className="text-[var(--primary)] underline">Privacy Policy</a>,
            which describes how we collect, use, store, and protect your personal information in accordance with
            the Privacy Act 1988 (Cth) and the Australian Privacy Principles.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mt-6 mb-2">7. Availability</h2>
          <p>
            We aim to keep the App available at all times but do not guarantee uninterrupted access.
            The App may be temporarily unavailable for maintenance, updates, or due to circumstances beyond our control.
          </p>
          <p className="mt-2">
            We strongly recommend exporting a PDF summary regularly so you have a local copy of your data.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mt-6 mb-2">8. Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>The App is provided &quot;as is&quot; without warranties of any kind</li>
            <li>We are not liable for any loss, damage, or harm arising from your use of the App</li>
            <li>We are not liable for decisions made based on information tracked in the App</li>
            <li>We are not liable for any delay in seeking medical attention</li>
          </ul>
          <p className="mt-2">
            Nothing in these terms excludes or limits any consumer guarantees under the Australian Consumer Law
            that cannot be excluded or limited by law.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mt-6 mb-2">9. Account termination</h2>
          <p>
            You can delete your account at any time via Settings. This permanently deletes all your data
            and cannot be undone. We may also suspend or terminate accounts that violate these terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mt-6 mb-2">10. Changes to these terms</h2>
          <p>
            We may update these terms from time to time. If we make material changes, we will notify you
            within the App. Continued use after changes constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mt-6 mb-2">11. Governing law</h2>
          <p>
            These terms are governed by the laws of Queensland, Australia. Any dispute will be subject to
            the jurisdiction of the courts of Queensland.
          </p>
        </section>

        <div className="mt-8 pt-4 border-t border-[var(--border)] text-xs text-[var(--ink-soft)]">
          <p>
            <a href="/" className="text-[var(--primary)]">← Back to the app</a>
          </p>
        </div>
      </div>
    </div>
  );
}
