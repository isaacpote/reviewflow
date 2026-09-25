import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Terms of Service — ReviewFlow" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="24 September 2026">
      <section>
        <h2>1. What ReviewFlow is</h2>
        <p>
          ReviewFlow lets a business send text-message review requests to its own customers,
          using a phone number provisioned through our messaging provider, with contacts
          imported from the business&apos;s practice-management or booking system. By creating an
          account you agree to these terms on behalf of yourself and the business you represent.
        </p>
      </section>

      <section>
        <h2>2. Your responsibility for consent</h2>
        <p>
          You may only send messages to people who have given you consent to be contacted, or
          whose consent is otherwise permitted under the law that applies to you — in Australia,
          the <em>Spam Act 2003</em>. ReviewFlow provides tools to help (an opt-out notice on every
          message, and automatic handling of STOP replies) but <strong>you remain responsible</strong>{" "}
          for having a lawful basis to message each contact. Do not upload contact lists you
          are not entitled to message.
        </p>
      </section>

      <section>
        <h2>3. Acceptable use</h2>
        <ul>
          <li>Messages must be genuine requests for feedback about a service the person received.</li>
          <li>No offering incentives in exchange for positive reviews, and no messages that misrepresent who you are.</li>
          <li>No unlawful, harassing, deceptive, or misleading content.</li>
          <li>Never try to bypass opt-outs. Anyone who replies STOP is excluded from all future messages.</li>
          <li>We may suspend an account that breaks these rules or that generates complaints or carrier blocks.</li>
        </ul>
      </section>

      <section>
        <h2>4. Verification</h2>
        <p>
          To reduce misuse we may ask you to verify your business (for example an Australian
          Business Number) and your identity (a government-issued ID checked through a third-party
          verification provider). We may limit or suspend messaging until verification is complete.
        </p>
      </section>

      <section>
        <h2>5. Third-party services</h2>
        <p>
          ReviewFlow depends on third parties, including a telecommunications provider for
          sending texts, a payments and identity provider, a database host, and the practice
          systems you choose to connect. We aren&apos;t responsible for outages or changes at those
          providers, and message delivery depends on carriers we don&apos;t control.
        </p>
      </section>

      <section>
        <h2>6. Fees</h2>
        <p>
          Fees, plan limits, and any messaging or number costs are as agreed with you when you
          sign up. Phone numbers and message usage may incur pass-through charges from our
          providers.
        </p>
      </section>

      <section>
        <h2>7. Reviews and results</h2>
        <p>
          We can&apos;t promise any particular number of reviews, star rating, or business outcome.
          Whether someone leaves a review, and what they say, is entirely up to them.
        </p>
      </section>

      <section>
        <h2>8. Liability</h2>
        <p>
          To the extent permitted by law, the service is provided &quot;as is&quot;, and our total
          liability to you for any claim is limited to the fees you paid us in the three months
          before the claim arose. Nothing in these terms excludes rights you have under the
          Australian Consumer Law that can&apos;t be excluded.
        </p>
      </section>

      <section>
        <h2>9. Ending your account</h2>
        <p>
          You can stop using ReviewFlow at any time and ask us to delete your account and data.
          We may suspend or end accounts that breach these terms.
        </p>
      </section>

      <section>
        <h2>10. Governing law and contact</h2>
        <p>
          These terms are governed by the laws of Australia. Questions? Contact us at
          support@reviewflow.app.
        </p>
      </section>
    </LegalPage>
  );
}
