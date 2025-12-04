import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileSearch, BarChart3, Lightbulb, LayoutGrid, CheckCircle2 } from 'lucide-react'

const features = [
  {
    icon: FileSearch,
    title: '媒体分析',
    description: '求人条件を入力するだけで、最適な求人媒体をAIが分析・提案します。',
  },
  {
    icon: LayoutGrid,
    title: '媒体データベース',
    description: '医療・介護業界の主要求人媒体の特徴や費用を網羅的に確認できます。',
  },
  {
    icon: BarChart3,
    title: 'PESO診断',
    description: 'Paid・Earned・Shared・Ownedの4軸で採用活動を診断します。',
  },
  {
    icon: Lightbulb,
    title: '施策提案',
    description: '診断結果に基づき、効果的な採用施策を具体的に提案します。',
  },
]

const plans = [
  {
    name: 'Free',
    price: '0',
    description: '個人利用・お試しに',
    features: ['月3回の分析', '基本的な媒体提案', 'PESO診断'],
    cta: '無料で始める',
    popular: false,
  },
  {
    name: 'Light',
    price: '9,800',
    description: '小規模事業所向け',
    features: ['月10回の分析', '詳細な媒体提案', 'PESO診断', '施策提案', 'メールサポート'],
    cta: '始める',
    popular: false,
  },
  {
    name: 'Standard',
    price: '29,800',
    description: '中規模法人向け',
    features: ['月30回の分析', '詳細な媒体提案', 'PESO診断', '施策提案', '優先サポート', 'レポート出力'],
    cta: '始める',
    popular: true,
  },
  {
    name: 'Premium',
    price: '98,000',
    description: '大規模法人向け',
    features: ['無制限の分析', '詳細な媒体提案', 'PESO診断', '施策提案', '専任サポート', 'レポート出力', 'API連携'],
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
            <span className="text-xl font-bold text-blue-600">MEDICA SOERUTE</span>
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/login">ログイン</Link>
            </Button>
            <Button asChild>
              <Link href="/register">無料で始める</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-b from-blue-50 to-white">
        <div className="container text-center">
          <Badge className="mb-4" variant="secondary">
            医療・介護業界特化
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            採用媒体選びを、
            <br />
            <span className="text-blue-600">もっとスマートに</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            AIが求人条件を分析し、最適な求人媒体を提案。
            採用コストの最適化と効率的な人材確保を実現します。
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/register">無料で始める</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">ログイン</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">主な機能</h2>
            <p className="text-gray-600">採用活動を効率化する4つの機能</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="text-center">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-gray-50">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">料金プラン</h2>
            <p className="text-gray-600">ニーズに合わせて選べる4つのプラン</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={plan.popular ? 'border-blue-600 border-2 relative' : ''}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    人気
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-3xl font-bold">¥{plan.price}</span>
                    <span className="text-gray-500">/月</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={plan.popular ? 'default' : 'outline'}
                    asChild
                  >
                    <Link href="/register">{plan.cta}</Link>
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
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            今すぐ始めましょう
          </h2>
          <p className="text-gray-600 mb-8">
            無料プランで、AIを活用した媒体分析を体験してください。
          </p>
          <Button size="lg" asChild>
            <Link href="/register">無料で始める</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-500">
              © 2024 MEDICA SOERUTE. All rights reserved.
            </div>
            <div className="flex gap-6 text-sm text-gray-500">
              <Link href="#" className="hover:text-gray-900">
                利用規約
              </Link>
              <Link href="#" className="hover:text-gray-900">
                プライバシーポリシー
              </Link>
              <Link href="#" className="hover:text-gray-900">
                お問い合わせ
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
