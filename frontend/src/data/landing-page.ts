import { BookOpen, CalendarDays, FileUp, GraduationCap, MapPin, MessageCircle, MonitorSmartphone, ShieldCheck, Sprout, Users } from "lucide-react";

// Staff can edit public wording here without changing the page layout.
export const landingNavigation = [
  { label: "Tungkol sa ALS", href: "#about" },
  { label: "Mga programa", href: "#programs" },
  { label: "Paano mag-enroll", href: "#enrollment" },
  { label: "Learning center", href: "#directory" },
  { label: "Mga tanong", href: "#faq" },
];

export const landingBenefits = [
  { icon: BookOpen, title: "Libre ang pag-aaral", description: "Walang enrollment o tuition fee." },
  { icon: CalendarDays, title: "Flexible ang oras", description: "Pag-aaral na kasabay ng iyong buhay." },
  { icon: GraduationCap, title: "DepEd-recognized", description: "May landas sa pagkumpleto ng basic education." },
];

export const landingFeatures = [
  { icon: MonitorSmartphone, title: "Gabay sa registration", description: "Alamin mula sa phone ang mga hakbang sa pag-enroll. Tutulungan ka ng ALS teacher." },
  { icon: FileUp, title: "Paghahanda ng dokumento", description: "Ihanda ang digital copies o ihatid ang requirements sa mobile teacher." },
  { icon: MapPin, title: "Learning center mo", description: "Piliin ang barangay para tingnan ang directory ng learning center at guro." },
  { icon: Users, title: "Student at teacher portal", description: "Mag-login gamit ang assigned account para sa learning resources at mga gawain." },
  { icon: ShieldCheck, title: "Pribadong learner records", description: "Ang personal na impormasyon ay para sa enrollment at learner records lamang." },
  { icon: MessageCircle, title: "Kausap ang iyong guro", description: "Makipag-ugnayan sa mobile teacher kapag nakumpirma na ang contact details." },
];

export const landingPrograms = [
  { icon: Sprout, short: "BLP", title: "Basic Literacy", audience: "Para sa gustong matutong bumasa, sumulat, at magbilang.", detail: "Magsimula sa mga pangunahing kasanayan na magagamit sa araw-araw. Tutulungan ka ng ALS teacher na alamin ang angkop na learning level." },
  { icon: BookOpen, short: "A&E ELEMENTARY", title: "Elementary", audience: "Para sa hindi nakatapos ng elementarya. Karaniwang 12 taong gulang pataas.", detail: "Ipagpatuloy ang elementary education sa pamamagitan ng ALS. Kumpirmahin sa guro ang eligibility at mga kailangang assessment para sa iyong sitwasyon." },
  { icon: GraduationCap, short: "A&E JUNIOR HIGH", title: "Junior High School", audience: "Para sa hindi nakatapos ng junior high. Karaniwang 16 taong gulang pataas.", detail: "Palawakin ang iyong kaalaman at life skills. Gagabayan ka ng guro sa learning plan at mga requirement para sa pagkumpleto ng programa." },
  { icon: GraduationCap, short: "ALS SENIOR HIGH", title: "Senior High School", audience: "Para sa susunod na hakbang matapos ang junior high school.", detail: "Maghanda para sa karagdagang pag-aaral o trabaho. Magtanong sa guro tungkol sa lokal na availability, admission requirements, at mga track na maaaring salihan." },
];

export const enrollmentDocuments = [
  "PSA Birth Certificate; itanong sa guro kung kailangan ang Marriage Contract",
  "Dalawang 2×2 ID photo na may puting background",
  "Form 137 o Report Card mula sa dating paaralan, kung mayroon",
];

export const landingFaqs = [
  { question: "May pasok ba araw-araw?", answer: "Hindi katulad ng regular na araw-araw na klase ang ALS. Maaaring modular, weekend, o ibang flexible na schedule, depende sa learning center. Pag-usapan ninyo ng guro ang oras na angkop sa trabaho at pamilya mo." },
  { question: "Overaged na ako, pwede pa ba?", answer: "Oo. Walang upper age limit para sa adult learners. Hindi huli ang lahat para magpatuloy. Tutulungan ka ng guro na alamin ang programang angkop sa iyong edad at dating pag-aaral." },
  { question: "Saan ang exam?", answer: "Ia-anunsyo ng iyong ALS teacher ang opisyal na lugar, petsa, at mga requirement ng assessment. Kumpirmahin muna sa guro ang testing center sa Santa Cruz bago pumunta." },
  { question: "Talaga bang libre?", answer: "Oo. Libre ang ALS basic education sa DepEd. Walang enrollment o tuition fee. Kung may tanong tungkol sa bayarin, makipag-ugnayan sa iyong ALS teacher o sa division office." },
  { question: "Valid ba ang diploma?", answer: "Kinikilala ng DepEd ang ALS certification kapag nakumpleto ang naaangkop na learning at assessment requirements. Ang susunod na antas ng pag-aaral o trabaho ay nakadepende sa natapos mong level at admission o employment requirements." },
];
