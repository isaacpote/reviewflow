import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Privacy Policy — ReviewFlow" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="24 September 2026">
      <section>
        <h2>Who we are</h2>
        <p>
          ReviewFlow provides review-request messaging for local businesses. This policy explains
          what personal information we handle, why, and what your rights are. We handle it in line
          with the Australian Privacy Principles under the <em>Privacy Act 1988</em>.
        </p>
      </section>

      <section>
        <h2>Two kinds of people we hold information about</h2>
        <p>
          <strong>Our customers</strong> — the business owners who sign up. <strong>Their
          customers</strong> — patients, diners, and clients whose contact details a business
          uploads or syncs so we can send them a review request. For the second group, the
          business is responsible for having the right to contact them; we process the details
          on the business&apos;s behalf.
        </p>
      </section>

      <section>
        <h2>What we collect</h2>
        <ul>
          <li>Account details: email, hashed password, business name, type, and ABN.</li>
          <li>Identity verification: a government ID check is performed by our verification provider; we store only the outcome and the verified name, not the ID images.</li>
          <li>Contacts a business imports or syncs: name, mobile number, email, and visit count. We do <strong>not</strong> collect clinical notes, treatment details, or health records.</li>
          <li>Message logs: what was sent, to whom, when, and delivery status, including STOP/opt-out replies.</li>
          <li>Connection credentials for the systems a business connects (for example a practice-management API key), stored encrypted.</li>
        </ul>
      </section>

      <section>
        <h2>Why we use it</h2>
        <ul>
          <li>To send the review requests a business configures, and to honour opt-outs.</li>
          <li>To verify businesses and prevent misuse of messaging.</li>
          <li>To run, secure, and support the service.</li>
        </ul>
        <p>We don&apos;t sell personal information or use it for advertising.</p>
      </section>

      <section>
        <h2>Who else handles it</h2>
        <p>
          We use trusted providers to operate the service: a telecommunications provider (to send
          texts), a payments and identity-verification provider, a database host (located in
          Australia), and application hosting. They process information only to provide their service
          to us. Some may store or process data outside Australia.
        </p>
      </section>

      <section>
        <h2>Opting out</h2>
        <p>
          Every message includes an opt-out instruction. Replying STOP removes a person from all
          future messages from that business, and replying START opts them back in.
        </p>
      </section>

      <section>
        <h2>Security and retention</h2>
        <p>
          Credentials are encrypted, passwords are hashed, and access to a business&apos;s data is
          restricted to that business. We keep information while an account is active and for a
          reasonable period afterwards for legal and dispute purposes, then delete or de-identify it.
        </p>
      </section>

      <section>
        <h2>Your rights</h2>
        <p>
          You can ask to access or correct information we hold about you, or ask us to delete it.
          If you received a message from a business using ReviewFlow, you can contact that business
          directly as well as us. We&apos;ll respond within a reasonable time.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>Privacy questions or requests: support@reviewflow.app.</p>
      </section>
    </LegalPage>
  );
}
