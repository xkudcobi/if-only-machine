# Keşke Makinesi

In English: [README.md](README.md)

"%15 düşünce al, %20 kâra geçince sat" gibi basit bir kural seç, beş yıllık inişli çıkışlı bir piyasada baştan oynat ve bir kere alıp beklemekten daha iyi mi yaptı, gör — sonra bunun beceri mi yoksa şans mı olduğunu öğren.

`index.html` dosyasını herhangi bir güncel tarayıcıda aç, o kadar. Kurulum yok, sunucu yok, internet bağlantısı gerekmiyor. Sayfa çalışan bir örnekle açılır (şişip patlayan bir balon piyasası ve akıntıya uyan bir kural); yani ilk saniyeden bakacak ve kurcalayacak bir şey vardır.

## Ekranda neler var

- **Üstteki hikâye.** Tek cümle kimin kazandığını jeton cinsinden söyler: kural mı, sadece elde tutmak mı. Altında kuralın kaç kez alım yaptığı ve zamanın ne kadarında piyasada kaldığı yazar.
- **Fiyat grafiği.** Yeşil şeritler kuralın elinde tuttuğu dönemler; yeşil üçgenler alış, kırmızılar satış. Grafiğin üstünde gezinince o günü, fiyatı ve iki bakiyeyi okursun. **Yeniden oynat** tüm geçmişi ilk günden itibaren gözünün önünde yürütür.
- **Jeton grafiği.** Kuralla jetonların (düz yeşil) ve sadece elde tutmak (kesikli gri) yan yana.
- **Tüm ayarlar bir arada.** Her kuralın iki düğmesi var. Harita bu iki düğmenin bütün bileşimlerini (576 versiyon) birkaç milisaniyede çalıştırır ve her kareyi boyar: yeşil elde tutmayı geçti, kırmızı ona yenildi, yıldız en iyi kare. Bir kareye tıklayınca ya da ok tuşlarıyla o ayara geçersin.
- **Beceri mi, şans mı?** Kural 200 paralel dünyada yeniden çalıştırılır: aynı piyasa kısa parçalara bölünür ve rastgele bir sırayla yeniden yapıştırılır. Histogram kuralın bu dünyalardaki sonuçlarını gösterir, düz bir cümle de hükmü verir. Haritadaki en iyi karenin bu dünyalarda ne yaptığına da bakılır; sayfadaki en ayıltıcı satır genelde odur.
- **Rakamlar.** Sondaki jeton, yıllık ortalama, yoldaki en kötü düşüş, alım sayısı, kârla biten işlemlerin oranı, piyasada geçen süre ve yolculuğun ne kadar sarsıntılı olduğu; hepsi elde tutmakla yan yana.

## Piyasalar ve kurallar

Altı uydurma piyasa var. Her biri bir tohumdan üretilir, yani aynı piyasa her açılışta aynı görünür:

| Piyasa | Ne yapar |
| --- | --- |
| Sakin tırmanış | Küçük dalgalanmalarla yavaş ve istikrarlı yükseliş |
| Hız treni | Büyük salınımlar, iki yöne de ani sıçramalar |
| Balon ve patlama | Önce normal, sonra çılgınlık, sonra çöküş, ardından uzun bir mahmurluk |
| Uzun durgunluk | Kısa iyi bir dönem, yıllarca süren düşüş, kısmi toparlanma |
| Yerinde sayan | Tekrar tekrar aynı seviyeye geri çekilir |
| Huysuz | Sakin ve gergin dönemler arasında rastgele gidip gelir |

**Başka bir versiyon** düğmesi piyasanın türünü korur ama şansı yeniden dağıtır.

Her biri iki düğmeli dört kural var:

| Kural | Düz Türkçesiyle |
| --- | --- |
| Akıntıya uy | Kısa dönem ortalaması uzun dönem ortalamasının üstündeyken elinde tut |
| Düşüşte al | Fiyat 60 günlük zirvesinin %X altına inince al, %Y kâra geçince sat |
| Zirveyi kovala | Fiyat son N günün en yükseğini geçince al, son M günün en düşüğünü kırınca sat |
| Geri sekmeye oyna | Fiyat ortalamasının epey altına düşünce al, ortalamaya dönünce sat |

## Dil

Sayfa Türkçe ve İngilizce konuşur. Sağ üst köşedeki **TR | EN** düğmesiyle dili değiştirebilirsin; her şey anında değişir ve seçimin bir dahaki sefere hatırlanır. İlk ziyarette dil tarayıcının ayarından seçilir.

## Daha derine

Rakamların altındaki **Kendi fiyatlarını kullan, masrafı değiştir, denemelerini kaydet** bölümünü aç:

- **Kendi fiyatların.** Her satıra bir fiyat gelecek şekilde bir liste ya da tarih ve fiyat sütunu olan bir CSV yapıştır; istersen dosya aç ya da dosyayı metin kutusuna sürükle. `Close`, `Adj Close`, `Price`, `Kapanış`, `Fiyat` gibi başlıklar kendiliğinden bulunur; bulunamazsa son sayısal sütun kullanılır. Virgül, noktalı virgül ve sekme ile ayrılmış dosyalar da, `1,234.56` ya da `1.234,56` biçimindeki sayılar da okunur. Yeniden eskiye sıralı dosyalar ters çevrilir. En az 60 satır gerekir. Bir sorun varsa mesaj satır numarasını söyler.
- **Masraflar.** İşlem başına masraf (varsayılan %0,2) her alışta ve her satışta kesilir. Artırınca çok işlem yapan kuralların nasıl dağıldığını izleyebilirsin. Başlangıç jetonu da değiştirilebilir.
- **Kayıtlı denemeler.** Denemene bir ad verip tarayıcıya kaydedebilirsin. Kendi fiyatların da onunla birlikte saklanır.
- **Bağlantı paylaş.** Adres çubuğu her zaman o anki denemeyi taşır (`#m=bubble&s=1&r=trend&a=18&b=90&...`); kopyaladığın bağlantı başka bir bilgisayarda da aynı şeyi açar. Kendi fiyatların bağlantıya sığmaz.

## Nasıl çalışıyor

Kural geleceği asla görmez. Her günün kapanışında yalnızca o güne kadarki fiyatlara bakıp "elinde tut" ya da "dışarıda kal" der; bu karar bugünün kapanışından yarının kapanışına kadarki harekete uygulanır. Testlerden biri, belli bir günden sonraki bütün fiyatları değiştirip hiçbir kuralın o günden önceki tek bir kararının bile değişmediğini kontrol eder.

Kural içerideyken jetonlar fiyatla birlikte büyür ya da küçülür, dışarıdayken yerinde durur. Her pozisyon değişikliğinde masraf kesilir. "Sadece elde tutmak" da aynı simülasyondur, yalnızca kural her gün "içeride" der; dolayısıyla masrafı bir kez öder.

Harita 576 bileşimin hepsi için tek bir pozisyon tamponu ve tek bir gösterge önbelleği kullanır. Her hareketli ortalama, kayan en yüksek, kayan en düşük ve kayan salınım pencere başına bir kez O(n) sürede hesaplanır (ortalama ve salınım için kayan toplamlar, en yüksek ve en düşük için tek yönlü kuyruk) ve ona ihtiyaç duyan bütün karelerce paylaşılır. Her kare için yalnızca özet sayılar saklanır; tam jeton eğrisi sadece seçili ayar için çizilir.

Paralel dünyalar blok karıştırmayla (block bootstrap) kurulur: gerçek geçmişin günlük hareketleri 20 günlük parçalara bölünür, rastgele çekilir ve uç uca eklenir. Böylece kısa vadeli doku (trendler, sakin ve gergin dönemler) korunur ama sıra karışır. Deney her animasyon karesinde birkaç dünya çalıştırır, sayfa hiç donmaz; bir düğmeye dokunduğunda sessizce baştan başlar. Hüküm bilerek basit tutuldu:

- dünyaların en az %60'ında elde tutmayı geçtiyse: beceriye benziyor
- %40 ile %60 arası: yazı tura
- %40'ın altında ama gerçek geçmişte kazandıysa: büyük ihtimalle şans
- %40'ın altında ve burada da kaybettiyse: kazandırmıyor

## Dosya düzeni

```
index.html            sayfa iskeleti, betikleri sırayla yükler
css/style.css         bütün stil
js/core/              DOM'a dokunmayan, Node'da test edilebilen mantık
  rng.js              tohumlu rastgele sayılar (mulberry32 + Box-Muller)
  markets.js          piyasa senaryoları ve fiyat üreteci
  indicators.js       kayan ortalama, salınım, en yüksek, en düşük ve önbellek
  strategies.js       dört kural, düğmeleri ve düğme ızgarası
  engine.js           gün gün simülasyon ve özet sayılar
  sweep.js            harita için bütün bileşimleri çalıştırır
  worlds.js           paralel dünyalar, hüküm, histogram
  csv.js              yapıştırılan ya da bırakılan fiyat listelerini okur
js/i18n.js            ekranda görünen her cümle, Türkçe ve İngilizce
js/format.js          dile göre sayı ve yüzde biçimi
js/state.js           tek durum nesnesi ve reducer
js/storage.js         kayıtlar, son oturum, paylaşım bağlantıları
js/model.js           durumdan türetilen, hafızalı sonuçlar
js/ui/                çizim ve girdi: grafikler, harita, şans paneli, kontroller
js/app.js             durumu, modeli ve arayüzü birbirine bağlar
tests/                çekirdek, durum, kayıt ve sözlük için Node testleri
```

Değişiklikler tek yönde akar: bir girdi bir eylem gönderir, reducer yeni bir durum döndürür, model yalnızca o değişikliğin etkilediği kısmı yeniden hesaplar (düğme oynatmak haritayı yeniden çalıştırmaz, piyasa değiştirmek çalıştırır) ve arayüz yeniden çizilir.

## Testler

Node.js 18 ya da daha yenisiyle:

```
npm test
```

ya da `node tests/run.js`. Hiçbir bağımlılık yok. Testler göstergeleri yavaş referans hesaplarla karşılaştırır; simülasyonu (masraflar, en kötü düşüş, açık işlemler, geleceğe bakmama) sınar; her kuralı elle hazırlanmış fiyat listelerinde dener; haritayı tek tek çalıştırılan kurallarla kıyaslar; paralel dünyaları, CSV okuyucusunu ve hata mesajlarını, reducer'ı, kaydetmeyi ve bağlantıları (bozuk depolama dahil) ve Türkçe ile İngilizce sözlüklerin aynı anahtarlara ve yer tutuculara sahip olduğunu kontrol eder.

## Bir not

Piyasalar uydurmadır ve buradaki hiçbir şey yatırım tavsiyesi değildir. Sayfanın asıl derdi şu: geçmişte işe yarayacak bir kural bulmak çok kolay, bunun bir anlam taşıması ise çok nadir.

## Lisans

MIT, ayrıntılar için [LICENSE](LICENSE).
