// T-007（アカウント・課金）専用の差分辞書。web の messages に無いキーだけをここへ置く。
// Report の表示文言は web 辞書（messages/*.json）をそのまま使う。
export const accountBillingJa = {
  Account: {
    anonymousTitle: "記録が消える可能性があります",
    anonymousWarning:
      "いまは端末内だけのアカウントです。アプリを消したり端末を変えたりすると、記録に戻れなくなります。Googleアカウントと連携すると、別の端末でも続きから遊べます。",
    link: "Googleアカウントと連携する",
    working: "Googleへ移動しています…",
    returnToLinked: "以前にGoogle連携した記録に戻る",
    signInWarning:
      "以前にこのアプリでGoogle連携したことがある場合だけ選んでください。連携したことのないGoogleアカウントを選ぶと、新しいアカウントが作られ、この端末の記録は取り出せなくなります。はじめての方は「Googleアカウントと連携する」を選んでください。",
    signIn: "ログインする",
    cancel: "やめる",
    linkedTitle: "Googleアカウントと連携済みです",
    linkedDescription:
      "{email} でログインしています。別の端末でも同じアカウントでログインすれば、同じ記録を続けられます。",
    linkedDescriptionNoEmail:
      "別の端末でも同じアカウントでログインすれば、同じ記録を続けられます。",
    linkDone: "Googleアカウントとの連携が完了しました。",
    conflict:
      "このGoogleアカウントは既に別のアカウントで使われています。データの統合は行えないため、そのアカウントでログインし直すか、別のGoogleアカウントを選んでください。",
    manualLinkingDisabled: "アカウント連携がサーバー側で有効になっていません。設定を確認してください。",
    validationFailed: "Googleログインがサーバー側で有効になっていません。設定を確認してください。",
    linkFailed: "Googleとの連携に失敗しました。時間をおいてもう一度お試しください。",
    deleteTitle: "アカウントを削除する",
    deleteUnavailable:
      "アカウントの削除は現在準備中です。削除すると食事・排便・バトルの記録と図鑑がすべて消えます。",
    deletePending: "準備中",
    deleteAction: "アカウントを削除する",
    planLabel: "プラン",
    planNone: "未登録",
    planActive: "プレミアム",
    planLapsed: "お支払い確認中",
    viewPlan: "プランを見る",
  },
  Billing: {
    premiumTitle: "プレミアム",
    subscribedTitle: "プレミアムをご利用中です",
    appleManaged:
      "この購読はApp Storeで購入されています。管理・解約はiPhoneの設定の「Apple Account」→「サブスクリプション」から行えます。",
    scheduledUntil: "{date} に解約されます。それまではプレミアムをご利用いただけます。",
    lapsedTitle: "お支払いをご確認ください",
    lapsedApple:
      "プレミアムのお支払いが確認できていません。記録やアカウントは残っています。支払い状態の確認・変更はApp Storeのサブスクリプション設定から行えます。",
    lapsedOther:
      "プレミアムのお支払いが確認できていません。記録やアカウントは残っています。",
    notSubscribed: "プレミアムに登録すると、週次レポートの分析がすべて見られます。",
    goPurchase: "プレミアムを見る",
    restore: "以前の購入を復元する",
    restoring: "復元しています…",
    purchaseTitle: "プレミアム",
    purchaseDescription: "週間レポートの分析がすべて見られます。",
    loading: "読み込んでいます…",
    unavailable: "課金機能はこの環境ではまだ使えません。配布版のアプリでご利用いただけます。",
    noOffers: "現在購入できるプランがありません。",
    buy: "購入する",
    purchasing: "購入しています…",
    purchased: "購入ありがとうございます。権利の反映まで数秒かかることがあります。",
    restored: "購入を復元しました。権利の反映まで数秒かかることがあります。",
    restoreNotFound: "復元できる購入が見つかりませんでした。",
    reflecting: "権利を確認しています…",
    reflected: "プレミアムが有効になりました。",
    failed: "処理を完了できませんでした。時間をおいてもう一度お試しください。",
    autoRenewNote:
      "サブスクリプションは自動更新されます。解約は、更新日の24時間前までにApp Storeの設定から行えます。",
    openReport: "レポートを見る",
    periodMonthly: "月額",
    periodYearly: "年額",
    periodWeekly: "週額",
    featureDaily: "毎日の回数と、便の形の内訳",
    featureCompare: "過去4週間との比較",
    featureRatio: "すっきり・出にくかった割合の変化",
    priceNote: "価格はApp Storeの表示に合わせて変わります。",
  },
};

export const accountBillingEn = {
  Account: {
    anonymousTitle: "Your records could be lost",
    anonymousWarning:
      "This account lives only on this device. Deleting the app or switching devices means losing your records. Link a Google account to keep playing anywhere.",
    link: "Link a Google account",
    working: "Taking you to Google…",
    returnToLinked: "Return to a previously linked account",
    signInWarning:
      "Only choose this if you've linked Google on this app before. Picking a Google account that was never linked creates a new account, and records on this device can't be recovered. New here? Use \"Link a Google account\" instead.",
    signIn: "Sign in",
    cancel: "Cancel",
    linkedTitle: "Linked to a Google account",
    linkedDescription:
      "You're signed in as {email}. Sign in on another device to continue with the same records.",
    linkedDescriptionNoEmail:
      "Sign in on another device to continue with the same records.",
    linkDone: "Your Google account is now linked.",
    conflict:
      "This Google account is already used by another account. We can't merge data, so sign in with that account or choose a different Google account.",
    manualLinkingDisabled: "Account linking isn't enabled on the server. Please check the configuration.",
    validationFailed: "Google sign-in isn't enabled on the server. Please check the configuration.",
    linkFailed: "Couldn't link with Google. Please try again later.",
    deleteTitle: "Delete account",
    deleteUnavailable:
      "Account deletion isn't available yet. Deleting removes all meal, bowel, and battle records and your collection.",
    deletePending: "Coming soon",
    deleteAction: "Delete account",
    planLabel: "Plan",
    planNone: "Not subscribed",
    planActive: "Premium",
    planLapsed: "Payment check needed",
    viewPlan: "See plans",
  },
  Billing: {
    premiumTitle: "Premium",
    subscribedTitle: "You're on Premium",
    appleManaged:
      "This subscription was purchased on the App Store. Manage or cancel it from your iPhone Settings → \"Apple Account\" → \"Subscriptions\".",
    scheduledUntil: "Cancels on {date}. Premium stays active until then.",
    lapsedTitle: "Please check your payment",
    lapsedApple:
      "We couldn't confirm your Premium payment. Your records and account are intact. Check your payment status in the App Store subscription settings.",
    lapsedOther: "We couldn't confirm your Premium payment. Your records and account are intact.",
    notSubscribed: "Subscribe to Premium to see the full weekly report analysis.",
    goPurchase: "See Premium",
    restore: "Restore previous purchases",
    restoring: "Restoring…",
    purchaseTitle: "Premium",
    purchaseDescription: "Unlock the full weekly report analysis.",
    loading: "Loading…",
    unavailable: "Purchases aren't available in this environment yet. They'll work in the distributed app.",
    noOffers: "No plans are available right now.",
    buy: "Subscribe",
    purchasing: "Purchasing…",
    purchased: "Thanks for subscribing. It may take a few seconds for access to show up.",
    restored: "Purchase restored. It may take a few seconds for access to show up.",
    restoreNotFound: "No purchases to restore were found.",
    reflecting: "Checking your access…",
    reflected: "Premium is now active.",
    failed: "Couldn't complete the request. Please try again later.",
    autoRenewNote:
      "Subscriptions renew automatically. To cancel, do so at least 24 hours before the renewal date in your App Store settings.",
    openReport: "View report",
    periodMonthly: "monthly",
    periodYearly: "yearly",
    periodWeekly: "weekly",
    featureDaily: "Daily counts and a breakdown of stool shapes",
    featureCompare: "Comparison with the past 4 weeks",
    featureRatio: "Changes in the share of easy vs. hard days",
    priceNote: "Prices follow what the App Store shows.",
  },
};
