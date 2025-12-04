import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Target, BarChart3, CheckCircle2, ArrowRight } from 'lucide-react'

const features = [
  {
    icon: BookOpen,
    title: '媒体カタログ',
    description: '医療・介護業界の主要求人媒体のデータを網羅。キーワードや流入データを確認できます。',
  },
  {
    icon: Target,
    title: '媒体マッチング',
    description: '求人条件を入力するだけで、最適な求人媒体をAIが分析・提案します。',
  },
  {
    icon: BarChart3,
    title: 'PESO診断',
    description: 'Paid・Earned・Shared・Ownedの4軸で採用活動を診断し、改善点を可視化します。',
  },
]

const plans = [
  {
    name: 'Starter',
    price: '9,800',
    description: '個人・小規模事業所向け',
    features: ['媒体マッチング 10回/月', 'PESO診断 無制限', '基本レポート出力'],
    cta: '14日間無料で試す',
    popular: false,
  },
  {
    name: 'Professional',
    price: '19,800',
    description: '中規模法人向け',
    features: ['媒体マッチング 50回/月', 'PESO診断 無制限', '詳細レポート出力', 'CSVエクスポート', '優先サポート'],
    cta: '14日間無料で試す',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'お問い合わせ',
    description: '大規模法人・複数拠点向け',
    features: ['媒体マッチング 無制限', 'PESO診断 無制限', '詳細レポート出力', 'CSVエクスポート', '専任サポート', 'API連携', 'カスタムレポート'],
    cta: 'お問い合わせ',
    popular: false,
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold text-primary">MEDICA SOERUTE</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              機能紹介
            </a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              料金
            </a>
          </nav>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/auth/login">ログイン</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/signup">無料で試す</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-b from-[hsl(var(--primary-light))] to-white">
        <div className="container text-center">
          <Badge className="mb-4 bg-primary/10 text-primary border-0">
            医療・介護業界特化
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            媒体選びを、
            <br />
            <span className="text-primary">データで武装する</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            求人媒体のSEOキーワードデータを分析し、
            <br className="hidden sm:block" />
            最適な採用戦略を導き出します。
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/auth/signup">
                無料で試す
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#features">詳しく見る</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">主な機能</h2>
            <p className="text-muted-foreground">データに基づいた採用媒体戦略を実現</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature) => (
              <Card key={feature.title} className="text-center border-0 shadow-sm">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-[hsl(var(--bg-page))]">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">料金プラン</h2>
            <p className="text-muted-foreground">14日間の無料トライアル付き</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={plan.popular ? 'border-primary border-2 relative shadow-lg' : 'border shadow-sm'}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                    おすすめ
                  </Badge>
                )}
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    {plan.price === 'お問い合わせ' ? (
                      <span className="text-2xl font-bold">{plan.price}</span>
                    ) : (
                      <>
                        <span className="text-3xl font-bold">¥{plan.price}</span>
                        <span className="text-muted-foreground">/月</span>
                      </>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={plan.popular ? 'default' : 'outline'}
                    asChild
                  >
                    <Link href="/auth/signup">{plan.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            今すぐ始めましょう
          </h2>
          <p className="text-muted-foreground mb-8">
            14日間の無料トライアルで、データドリブンな採用媒体選びを体験してください。
          </p>
          <Button size="lg" asChild>
            <Link href="/auth/signup">
              無料で試す
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 bg-[hsl(var(--bg-page))]">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-muted-foreground">
              © 2024 MEDICA SOERUTE. All rights reserved.
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link href="#" className="hover:text-foreground">
                利用規約
              </Link>
              <Link href="#" className="hover:text-foreground">
                プライバシーポリシー
              </Link>
              <Link href="#" className="hover:text-foreground">
                お問い合わせ
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
