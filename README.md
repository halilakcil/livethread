# LiveThread — Threads Analitiği & Yapay Zeka İçerik Motoru

Resmi Meta Threads API'si ile entegre çalışan; modern, hızlı ve yerel öncelikli (local-first) bir web uygulaması.

## Temel Özellikler

1. **Kişisel Threads Analitiği (Modül A)**
   - Yayınlanan Threads gönderilerinizi etkileşim metrikleriyle senkronize eder: **Görüntülenmeler, Beğeniler, Yorumlar/Yanıtlar, Yeniden Paylaşımlar (Repost), Alıntılar (Quote)**.
   - **30 günlük trend karşılaştırmaları** sunan özet metrik kartları.
   - Recharts destekli performans trend grafiği (Görüntülenmeler & Etkileşimler).
   - Tek tıkla sıralama (**En Çok Görüntülenen, En Çok Beğenilen, En Çok Yorum Alan, En Yeni**) ve metin filtreleme özelliklerine sahip interaktif veri tablosu.
   - Geçmişteki herhangi bir gönderi için tek tıkla **"Yapay Zeka ile Yeniden Yaz" (Rewrite with AI)** eylemi.

2. **Viral Konu Keşfi (Modül B)**
   - Konu etiketine (tag) veya anahtar kelime sorgusuna göre herkese açık Threads gönderilerini arayın.
   - **TAG** (Etiket) ve **KEYWORD** (Anahtar Kelime) modlarını destekler; **TOP** (en yüksek etkileşim) veya **RECENT** (kronolojik / en yeni) olarak sıralanabilir.
   - Hızlı tek tıkla konu etiketleri (`#software`, `#startup`, `#physics`, `#philosophy`, `#ai` vb.).
   - Yazar doğrulama rozeti ve Threads'e doğrudan bağlantılar içeren kart görünümü.
   - Her kart üzerinde doğrudan **"AI Studio'ya Aktar" (Import to AI Studio)** butonu.

3. **Yapay Zeka İçerik Stüdyosu & Yeniden Yazıcı (Modül C)**
   - Orijinal kaynak ile yeniden yazılan çıktıyı yan yana karşılaştıran çekmece (drawer) arayüzü.
   - Çoklu yapay zeka modları:
     - **Doğrudan Yeniden Yazım (Direct Rewrite):** Dikkat çekici, yüksek etkileşimli tek bir gönderi.
     - **Kanca Varyasyonları (Hook Variations):** Akışı durduran 3 farklı dikkat çekici giriş cümlesi.
     - **Zincir Bölme (Thread Split):** Birbiriyle bağlantılı bir zincir (thread) olarak paylaşılabilecek 2–3 parçalı gönderi.
   - **500 karakterlik Threads sınırını** denetleyen canlı karakter sayaçları.
   - Panoya kopyalama, yerel Taslaklara (Drafts) kaydetme veya Meta API üzerinden doğrudan yayınlama.
   - Studio sayfasında ham fikirler için hızlı karalama alanı (scratchpad).

4. **Güvenlik & Yerel Öncelikli (Local-First) Mimari**
   - Erişim belirteçleri (access tokens) ve API anahtarları tarayıcınızın `localStorage` alanında saklanır; asla bir veritabanına veya diske kaydedilmez.
   - CORS kısıtlamalarını önlemek ve kimlik bilgilerini gizlemek için Next.js Route Handler'ları üzerinden vekil sunucu (proxy) ile yönlendirilir.
   - IndexedDB önbellekleme mekanizması, metriklerinizin anında yüklenmesini sağlar.
   - Yerleşik **Demo Modu**, API anahtarına ihtiyaç duymadan gerçekçi örnek verilerle tüm kontrol paneli, keşif ve stüdyo özelliklerini denemenize olanak tanır.
   - Meta Threads limitleri için gerçek zamanlı 24 saatlik istek sınırlayıcı sayaçlar (24 saatte 250 gönderi yayınlama ve 2.200 arama).

---

## Başlangıç

### 1. Gereksinimler
- Node.js 18+ (Node.js 22 üzerinde test edilmiştir)
- npm 10+

### 2. Kurulum
```bash
git clone <repo-url>
cd livethread
npm install
```

### 3. Ortam Değişkenleri (İsteğe Bağlı)
Kimlik bilgileri, dosyalara dokunmaya gerek kalmadan tamamen web arayüzü içerisinden yapılandırılabilir. Tek kullanıcılı yerel barındırma (self-hosting) için sunucu düzeyinde yedek değerler tanımlamak isterseniz:
```bash
cp .env.example .env.local
```

### 4. Geliştirme Sunucusunu Çalıştırma
```bash
npm run dev
```
Tarayıcınızda [http://localhost:3000](http://localhost:3000) adresini açın.

---

## Meta Threads API Kurulumu & İzinler

Canlı bir Threads hesabını bağlamak için [Meta for Developers](https://developers.facebook.com/) üzerinde bir uygulama oluşturun:
1. Uygulamanıza **Threads** ürününü ekleyin.
2. Uygulama Rolleri / Threads Test Kullanıcısı (App Roles / Threads Tester) bölümünden Threads hesabınızı davet edin.
3. Aşağıdaki izinlere sahip bir Uzun Ömürlü Kullanıcı Erişim Belirteci (Long-Lived User Access Token) oluşturun:
   - `threads_basic` — hesap profilini ve yayınlanan gönderileri okuma
   - `threads_manage_insights` — görüntülenmeleri, beğenileri, yanıtları, yeniden paylaşımları alma
   - `threads_keyword_search` — herkese açık Threads gönderilerini arama
   - `threads_content_publish` — tekil gönderileri ve zincirleri yayınlama
4. Belirteci LiveThread kurulum ekranına veya ayarlar bölümüne yapıştırın.
