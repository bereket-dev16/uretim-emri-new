
Öncelikle Tasarımın, projenin kabataslak akış diyagramını public klasörünün içindeki diyagram.png dosyasını bulup inceleyebilirsin.

Depo stok, canlı akış vs özellikleri kalkıyor veritabanı dahil her yerden sil. Geriye kalanları aşağıda vericem.

Not: Tasarımı minimalizme çevir ve plc panel ekranına uyumlu olacak, modern css çok kullanma eski tarayıcılarda da çalışsın yani hover olmasın.Sadeleştirelim, küçültelim, maks laptop ekranında ve min tablet ekranında görünecek şekilde tasarlayalım. Bu bir kurumsal proje fazla tasarım şovuna gerek yok.


0- Login/Giriş Ekranı

Sayfa tam ekran olacak, sol tarafı kaplayacak bir resim, sağ taraf login formu. Bu kadar. Başlık slogan vs kullanma.

1- Anasayfa

Anasayfa ekranında 4 tane sekme yani buton olacak. Bunlar aynı şekilde headerda da olacak. 
Bu sayfadakileri, hat ekranı yani makine/karışım kullanıcıları görmicek zaten burayı üretim müdürü ve admin görecek. Depocuyuda kaldırıyoruz bu arada.

Butonlar: 

Anayfa(zaten anasayfa olduğu için seçili duracak arka plan rengi eklersin)
Üretim Emri oluştur
Devam Eden Emirler
Biten Emirler
Sağ üstte de admin paneli(sadece admin görecek)

Bunların altında dashboard verileri
	- Bugün Eklenen Toplam Emir sayısı
	- Biten Emirler
	- Devam Eden Emirler

2- Üretim Emri oluştur sayfası

Burayı yine üretim müdürü ve admin görebilir admin zaten her yere erişimi olacak.

- Form alanını çok büyük yapma yani veriler çok olacak ama tasarım olarak yer kaplamasın.

- Üst tarafta form alanı olacak, alt sectionda ise sevkedilecek birim olacak.

Form alanları:

- İş emri tarihi (format: date)
- İş emri no (format : number)
- Müşteri adı (format : text)
- Sipariş Miktarı (format : number)
- Termin tarihi (format : date)
- Son ürün adı (format : text)
- Toplam ambalaj miktarı (format : number)
- Renk (format : text)
- Kapsül/Tablet/Softjel Kalıbı (format : text)
- Prospektüs(var/yok) checkbox
- İhracat / İç Piyasa (format : checkbox)
- Numune / Müşteri Talebi / Stok (format : checkbox)
- Ambalaj Türü (format : checkbox) (Kapsül / Sıvı / Softjel / Tablet / Saşe)

Sevkedilecek Birim formu (Dropdown olsunki çok yer kaplamasın)

Sol taraf:
	
	Hammadde hazırlama
		- Toz Karışım
		- Sıvı Karışım
		- Softjel

Orta taraf

 	Makine Birimleri
		- Depo
		- Tablet 1
		- Tablet 2
		- Boya
		- Kapsül
		- Blister 1
		- Blister 2
		- Paket

Sağ taraf

	Ekle butonu olacak. Oraya excel, pdf veya görsel çıktısı bilgisayardan eklenebilecek. Emir detaylarında bu gözükecek ama makine ve hammadde birimlerin de görünmeyecek sadece üretim müdürü ve yine tekrarlıyorum admin görecek.

En aşağıda da Gönder butonu.

Not: Müdür sadece bir tane birime gönderebilecek çoklu seçim olmayacak yani hammaddeden bir, makineden bir birime. Bu sayfadan bahsediyorum. İleride ilgili emri diğer birimlere aktarabilecek gelecem oraya.

3- Devam Eden(Bekleyen) Emirler Sayfası(Hat ekranındaki ile karıştırılmamalı)

Üretim emri oluşturulduktan sonra ilgili emir hat ekranındaki gelen emirler sayfasına gidecek aynı zamanda üretim emrinin bu sayfasına düşecek. 

Burada bir tablo görünümü gibi, ürün detaylarının bulunduğu emirler gözükecek. Burada tasarım önemli. Detayları görmesi için, detaylı göster butonu olmalı. İlgili emir açılınca formda girmiş olduğu tüm veriler gözükecek. Kapalı olduğun da ise yani accordion kapalı ise üzerinde gerekli detaylar gözüksün işte no, müşteri adı vs. Bir de o ürünün durumu ve o an hangi hatta olduğu önizlemesi, bunu açılır detay ekranında anlatıcam.

Açılır detay ekranı;

İlgili emir açıldı. Üstte form giriş bilgileri olacak ürün detayları.
Altında ise; Sol tarafta bir Mevcut durum kartı olacak, iki sonuç gösterecek o ilgili emir o an hangi hatta yani kullanıcıda, makinede işlem görüyor bir de mevcut durumu ne; çalışıyor mu bitmiş mi? Eğer çalışıyorsa bir işlem yapılmaz zaten bitmesi beklenir. Hat ekranındaki kullanıcı bitti dediğinde, bu kartın yanında da bir gönder butonu ve yanında dropdown olacak o drosdownda da yine form alanındaki gibi tüm sevkedilecek birimler olacak. İlgili emir bu sefer orada seçilen kullanıcıya gönderilecek. Bu süreç bir döngü halinde devam edecek. Müdür ilgili tüm birimlere gönderdikten sonra, bitir butonuna basarsa o ilgili emirin artık bir işlemi kalmaz ve biten emirlere eklenir. Bir de bu döngüde o hatta o emir önceden gönderilmişse bir daha gönderilemez. O yüzden her seferinde ilgili dropdown gönder kısmı daha önce gönderilenleri disable olarak çıkart, seçilemesin.

4- Biten Emirler Sayfası (Hat ekranındaki ile karıştırılmamalı)

Burada da emir bitmiştir artık ve ilgili emir yine tüm detayları ile accordiyon şeklinde görünür. Pagination eklemeyi unutma.

5- HAT Ekranı (Gelen Emirler)

Not: Tüm ekranlarda emirlerde birikmeler olabilir ona göre performansı ayarla.

Buraya üretim müdür tarafından oluşturulan emir düşer ilgili hatta. Aynı şekilde akkordiyon şeklinde yine. Önizleme olarak önemli bilgiler gözükür. Detaylı göster butonunun yanında kabul et butonu olur. Tabii bu ekranda birikmeler olabilir hemen kabul etmeyebilir.

İlgili emri kabul et dediği zaman Devam eden emirler sayfasına düşer. Aynı zamanda real time olarak üretim müdürü ekranında çalışıyor moduna geçer.

6- HAT Ekranı (Devam Eden Emirler)

Kabul et dedikten sonra ilgili hattın ekranındaki emir buraya geçer. Burada da bitir ve detaylı göster butonu olur. 

Detaylı göster dediğinde "Son Sipariş Miktarı" alanı olacak, çıkan miktar yazılacak. Giden ekranda gözükecek. Üretim emri sipariş miktarını girecek zaten ama bazen o miktar hat tarafında değişebilir o yüzden hat kullanıcısıda onu yanına eklesin revize gibi iki bilgide gözüksün.

Daha sonra Bitir butonuna basacak ama hemen biten emirler sayfasına düşmeyecek. Üretim müdürü ekranında mevcut durum bitti gözükecek ve eğer başka bir hatta gönderirse burada biten emirlere düşecek ya da üretim müdürü direkt bitir butonuna basarsa burada yine biten emirler sayfasına gönderilecek ilgili emir.

Not: Butonlara validate eklemeyi unutma yanlışlıkla basılmasın diye.