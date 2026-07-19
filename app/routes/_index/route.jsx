import { redirect, Form, useLoaderData } from "react-router";
import { login } from "../../shopify.server";
import styles from "./styles.module.css";

export const loader = async ({ request }) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <div className={styles.icon}>📍</div>

        <h1 className={styles.heading}>SmartETA</h1>
        <p className={styles.tagline}>
          Accurate delivery dates by pincode, with smart rules and zero guesswork.
        </p>
        <p className={styles.text}>
          Show customers a real delivery date — not a generic "5-7 business days" — factoring in
          your processing time, cutoff, holidays, and product-specific rules.
        </p>

        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label}>
              <span>Shop domain</span>
              <input className={styles.input} type="text" name="shop" placeholder="my-shop-domain.myshopify.com" />
            </label>
            <button className={styles.button} type="submit">
              Log in
            </button>
          </Form>
        )}

        <ul className={styles.list}>
          <li>
            <strong>Pincode-level accuracy</strong>. Delivery dates calculated per pincode, not a
            single estimate for every customer.
          </li>
          <li>
            <strong>Smart rules engine</strong>. Adjust delivery time by product, collection,
            vendor, tag, or holiday — automatically.
          </li>
          <li>
            <strong>Built to convert</strong>. A countdown timer and customizable widget that
            builds trust instead of vague promises.
          </li>
        </ul>
      </div>
    </div>
  );
}
