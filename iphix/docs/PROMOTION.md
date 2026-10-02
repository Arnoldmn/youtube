# Promoting IPHIX COMMUNICATIONS and sharing the earnings

The website includes a **promoter (affiliate) programme**. Anyone with an account gets a personal link such as `https://your-domain/?ref=PATAB12`. When people buy through that link, the promoter earns a share of the sale. The website records everything automatically.

## How the money is shared

| Who | What they get | Setting |
|---|---|---|
| Promoter | `COMMISSION_PCT`% of the order value, not counting delivery (default **5%**) | `.env` |
| New customer | `REFERRAL_DISCOUNT_PCT`% off their **first** order (default **3%**) | `.env` |
| Minimum withdrawal | `MIN_PAYOUT` (default **KES 500**) | `.env` |

- The commission is **pending** until the order is marked **Delivered**. It then becomes **available**. Cancelled orders earn nothing.
- **Lifetime referrals:** someone who signs up with a promoter's code keeps earning that promoter commission on every later order.
- Promoters ask for payouts to M-Pesa from their dashboard (**💰 Earn**). An admin sends the money and marks the payout as paid (**Admin → Payouts**). There is also a WhatsApp "Notify" button to tell the promoter.
- Promoters cannot refer themselves.

**Choosing the percentages.** The promoter's commission plus the customer's discount must stay well below your profit margin. For example, a screen bought at KES 2,000 and sold at KES 3,000 has a KES 1,000 margin. 5% commission + 3% discount = KES 240, so you keep KES 760 and gained a customer you would not otherwise have had. On products with thin margins, such as some batteries, think about lowering the percentages. You can also hide those products from deals.

## Launch plan (first 30 days)

**Week 1: set up**
- Put your real WhatsApp Business number in `WHATSAPP_NUMBER` and your shop address in `STORE_ADDRESS`.
- Replace the placeholder images on your best sellers with real photos: screens, covers, tempered/UV glass, chargers, cables, batteries, charging ports and earphones.
- Create a Google Business Profile with the website link, so you appear in "phone repair near me" searches.
- Print a QR code to `https://your-domain` (or to your own promoter link) for the counter, receipts and flyers.

**Week 2: recruit promoters**
- Invite your regular customers, boda riders, students and friends to sign up at `#/earn`. Their link is ready immediately.
- Target **phone technicians and small shops**. They buy spares in bulk, so give them the wholesale price (10+ pieces). One technician can bring dozens of orders a month.
- Create a "IPHIX Promoters" WhatsApp group. Post one product with its price every day for promoters to forward.

**Week 3: content**
- Post a **WhatsApp status** daily: one product, the price, and the link. Each product page has a **Share & earn** box that builds the promoter's personal link to that product.
- Make short **TikTok/Reels** videos of a screen replacement before and after, an "original vs copy" glass test, or a fast charger test. Link to Repair Services.
- List your top items on **Facebook Marketplace** and in local buy-and-sell groups, with the website link.

**Week 4: reward and repeat**
- Hold a monthly "Top promoter" bonus, for example KES 1,000 to whoever sells the most (**Admin → Promoters** ranks them).
- Run **Flash Deals**: set a "was" price in Admin → Products and the item appears in the home-page countdown.
- Follow up delivered orders on WhatsApp and ask for a review. Repair customers come back for accessories.

## Messages promoters can copy

> 📱 Cracked screen? Weak battery? **IPHIX COMMUNICATIONS** has screens, batteries, charging ports, covers and tempered glass for Samsung, iPhone, Tecno, Infinix, Redmi, Oppo & Vivo. Order online, confirm on WhatsApp, track your delivery. Use my link for 3% off your first order 👉 {your link}

> 🔥 Deal of the day: {product} only {price}! Fast delivery or pick up at the shop. Order here 👉 {your link}

## Numbers to watch (Admin dashboard)

- **Open orders / orders today**: daily sales activity.
- **Promoter commission owed**: money set aside for payouts.
- **Low-stock items (≤3)**: restock before you run out of popular parts.
- **Promoters tab**: sign-ups, orders and sales for each promoter, so you can see who to reward.
