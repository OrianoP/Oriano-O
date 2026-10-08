import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, type Locale } from "@/lib/i18n";

const COPY: Record<Locale, { title: string; updated: string; sections: [string, string][] }> = {
  en: {
    title: "Privacy policy",
    updated: "Last updated October 2026",
    sections: [
      ["Who we are", "Oriano Pizza, Zouk Mikael, Lebanon. Phone and WhatsApp: +961 3 515 078."],
      ["What we collect", "When you order: your name, mobile number, delivery address and what you ordered. If you sign in with Google: your name and email address from your Google account. If you sign in with your number: your mobile number. We don't collect payment card details."],
      ["Why", "Only to prepare and deliver your order, contact you about it, show you its status, and keep your name and saved addresses so you don't have to type them again. We may also use your order history to keep track of loyalty rewards."],
      ["Sharing", "We never sell your information. Our delivery driver sees your name, number and address for your order. Our website and ordering system run on hosting providers (Vercel and Render) that store the data for us. Order confirmations may be sent through WhatsApp (Meta)."],
      ["Cookies", "We use one cookie to keep you signed in, and your phone's storage to remember your cart and addresses. No advertising trackers."],
      ["Your choices", "You can order as a guest, remove saved addresses from your account at any time, and sign out. To have your account and order history deleted, call or WhatsApp us on +961 3 515 078."],
    ],
  },
  ar: {
    title: "سياسة الخصوصية",
    updated: "آخر تحديث تشرين الأول ٢٠٢٦",
    sections: [
      ["مين نحنا", "أوريانو بيتزا، ذوق مكايل، لبنان. تلفون وواتساب: ‎+961 3 515 078."],
      ["شو منجمع", "لما تطلب: اسمك، رقم موبايلك، عنوان التوصيل وشو طلبت. إذا سجّلت بحساب Google: اسمك وإيميلك من حساب Google. إذا سجّلت برقمك: رقم موبايلك. ما منجمع معلومات بطاقات الدفع."],
      ["ليش", "بس لنحضّر طلبك ونوصّلو، ونتواصل معك بخصوصو، ونفرجيك حالتو، ونحفظ اسمك وعناوينك لتما تعيد تكتبن. ومنستعمل تاريخ طلباتك لبرنامج المكافآت."],
      ["المشاركة", "ما منبيع معلوماتك أبداً. سائق التوصيل بيشوف اسمك ورقمك وعنوانك لطلبك. موقعنا ونظام الطلبات شغّالين على شركات استضافة (Vercel وRender) بتحفظ المعلومات عنّا. تأكيد الطلب ممكن يوصل عبر واتساب (Meta)."],
      ["الكوكيز", "منستعمل كوكي واحد لتضل مسجّل، وذاكرة تلفونك لنتذكّر السلة والعناوين. ما في متتبّعات إعلانات."],
      ["خياراتك", "فيك تطلب كضيف، وتمحي عناوينك المحفوظة بأي وقت، وتطلع من حسابك. لتمحي حسابك وتاريخ طلباتك، اتصل أو ابعتلنا واتساب على ‎+961 3 515 078."],
    ],
  },
};

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return { title: COPY[lang].title };
}

export default async function PrivacyPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const c = COPY[lang];
  return (
    <div className="paper-grain pt-[calc(5.5rem+env(safe-area-inset-top))]">
      <article className="mx-auto max-w-2xl space-y-6 px-5 py-10">
        <header>
          <h1 className="font-display text-5xl text-ink">{c.title}</h1>
          <p className="mt-1 text-sm text-muted">{c.updated}</p>
        </header>
        {c.sections.map(([h, p]) => (
          <section key={h}>
            <h2 className="font-display text-2xl text-ink">{h}</h2>
            <p className="mt-1 leading-relaxed text-ink/80">{p}</p>
          </section>
        ))}
      </article>
    </div>
  );
}
