// src/data/mockModules.ts

export type ContentFile = {
  id: string;
  title: string;
  paragraphs: string[];
  contentJson?: any; // Holds the Tiptap JSONContent object from/for DB
};

export type LessonFolder = {
  id: string;
  title: string;
  sub_topics?: string[];
  recognize_competencies?: string | null;
  delivery_mode?: string | null;
  duration?: string | null;
  expected_output?: string | null;
  start_date?: string | null;
  finished_date?: string | null;
  status?: string | null;
  files: ContentFile[];
};

export type Module = {
  id: string;
  materials_id?: string;
  user_id?: string | null;
  filename?: string;
  storage_url?: string;
  storage_key?: string;
  learner_name?: string;
  cls_name?: string;
  als_program?: string;
  learning_strand?: string;
  main_learning_goal?: string | null;
  title: string;
  subtitle: string;
  lessons: LessonFolder[];
};

export const mockModules: Module[] = [
  {
    id: '0daa27e0-975c-45ed-ad75-bd7e55453cd4',
    materials_id: '88341d6d-2169-425b-a2d1-6bd55c8d49b5',
    user_id: null,
    filename: 'ILA-and-RLP-Filipino-BLP.docx',
    storage_url:
      'https://bfd422018f9d7ca418dd59b9fc9f4b26.r2.cloudflarestorage.com/finalthesis/Basic Literacy Program/ILA-and-RLP-Filipino-BLP.docx',
    storage_key: 'Basic Literacy Program/ILA-and-RLP-Filipino-BLP.docx',
    learner_name: 'JOHN PAULO D. NEQUINTO',
    cls_name: 'Sto. Angel Central',
    als_program: 'Basic Literacy Program',
    learning_strand: 'I- Filipino',
    main_learning_goal: null,
    title: 'Learning Strand I: Filipino (Basic Literacy Program)',
    subtitle: 'JOHN PAULO D. NEQUINTO • Sto. Angel Central',
    lessons: [
      {
        id: 'topic-1',
        title: '1. Natutukoy ang mga tunog sa Alpabetong Filipino',
        sub_topics: [],
        recognize_competencies: null,
        delivery_mode: 'Face to Face',
        duration: null,
        expected_output: null,
        start_date: null,
        finished_date: null,
        status: null,
        files: [
          {
            id: 'topic-1-file-1',
            title: 'Mga Tunog sa Alpabetong Filipino',
            paragraphs: [
              'Layunin: Natutukoy ang mga tunog sa Alpabetong Filipino.',
              'Paraan ng Paghahatid (Delivery Mode): Face to Face.',
              'Ang Makabagong Alpabetong Filipino ay binubuo ng 28 titik: A, B, C, D, E, F, G, H, I, J, K, L, M, N, Ñ, NG, O, P, Q, R, S, T, U, V, W, X, Y, at Z. Sa araling ito, pagsasanayan ang tamang pagkilala at pagbigkas ng bawat tunog ng titik.',
            ],
          },
        ],
      },
      {
        id: 'topic-2',
        title: '2. Natutukoy ang mga tunog na bumubuo sa salita',
        sub_topics: ['patinig', 'katinig'],
        recognize_competencies: null,
        delivery_mode: 'Modular',
        duration: null,
        expected_output: null,
        start_date: null,
        finished_date: null,
        status: null,
        files: [
          {
            id: 'topic-2-file-1',
            title: 'Patinig',
            paragraphs: [
              'Layunin: Natutukoy ang mga tunog na bumubuo sa salita (Patinig).',
              'Paraan ng Paghahatid (Delivery Mode): Modular.',
              'Ang mga patinig sa Alpabetong Filipino ay A, E, I, O, at U. Ito ang mga pangunahing tunog na nagbibigay-buhay sa pagbuo ng mga pantig at salita.',
            ],
          },
          {
            id: 'topic-2-file-2',
            title: 'Katinig',
            paragraphs: [
              'Layunin: Natutukoy ang mga tunog na bumubuo sa salita (Katinig).',
              'Paraan ng Paghahatid (Delivery Mode): Modular.',
              'Ang mga katinig ay binubuo ng 23 titik sa Alpabetong Filipino (B, C, D, F, G, H, J, K, L, M, N, Ñ, NG, P, Q, R, S, T, V, W, X, Y, Z) na isinasama sa mga patinig upang makabuo ng salita.',
            ],
          },
        ],
      },
      {
        id: 'topic-3',
        title:
          '3. Nabibigkas ang mga pantig na bumubuo sa salita -Patinig (P) Patinig-Katinig (PK) -Katinig-Patinig (KP)',
        sub_topics: [],
        recognize_competencies: null,
        delivery_mode: 'Blended',
        duration: null,
        expected_output: null,
        start_date: null,
        finished_date: null,
        status: null,
        files: [
          {
            id: 'topic-3-file-1',
            title: 'Kayarian ng Pantig: P, PK, at KP',
            paragraphs: [
              'Layunin: Nabibigkas ang mga pantig na bumubuo sa salita — Patinig (P), Patinig-Katinig (PK), at Katinig-Patinig (KP).',
              'Paraan ng Paghahatid (Delivery Mode): Blended.',
              'Halimbawa ng Patinig (P): a-so, i-sa. Halimbawa ng Patinig-Katinig (PK): ak-lat, is-da. Halimbawa ng Katinig-Patinig (KP): ba-ta, pu-so.',
            ],
          },
        ],
      },
      {
        id: 'topic-4',
        title: '4. Nababasa ang mga salitang may:',
        sub_topics: ['diptongo', 'klaster'],
        recognize_competencies: null,
        delivery_mode: 'RBI',
        duration: null,
        expected_output: null,
        start_date: null,
        finished_date: null,
        status: null,
        files: [
          {
            id: 'topic-4-file-1',
            title: 'Diptongo',
            paragraphs: [
              'Layunin: Nababasa ang mga salitang may diptongo.',
              'Paraan ng Paghahatid (Delivery Mode): RBI (Radio-Based Instruction).',
              'Ang diptongo ay alinmang patinig na sinusundan ng malapatinig na /w/ o /y/ sa loob ng isang pantig (aw, iw, ay, ey, iy, oy, uy). Halimbawa: bahay, araw, kahoy, sisiw.',
            ],
          },
          {
            id: 'topic-4-file-2',
            title: 'Klaster',
            paragraphs: [
              'Layunin: Nababasa ang mga salitang may klaster (kambal-katinig).',
              'Paraan ng Paghahatid (Delivery Mode): RBI (Radio-Based Instruction).',
              'Ang klaster o kambal-katinig ay dalawang magkaibang katinig na magkasunod sa loob ng isang pantig. Halimbawa: braso, plato, globo, trak, krus.',
            ],
          },
        ],
      },
      {
        id: 'topic-5',
        title: '5. Nagagamit sa pangungusap ang mga batayang salita (sight words)',
        sub_topics: [],
        recognize_competencies: null,
        delivery_mode: 'CBI',
        duration: null,
        expected_output: null,
        start_date: null,
        finished_date: null,
        status: null,
        files: [
          {
            id: 'topic-5-file-1',
            title: 'Mga Batayang Salita (Sight Words)',
            paragraphs: [
              'Layunin: Nagagamit sa pangungusap ang mga batayang salita (sight words).',
              'Paraan ng Paghahatid (Delivery Mode): CBI (Computer-Based Instruction).',
              'Ang mga batayang salita gaya ng "ang", "mga", "sa", "ay", "ng", "si", at "sina" ay madalas makita sa mga babasahin at ginagamit sa pagbuo ng maayos na pangungusap.',
            ],
          },
        ],
      },
      {
        id: 'topic-6',
        title: '6. natutukoy ang mga salitang madalas gamitin sa:',
        sub_topics: [
          'sarili at pamilya',
          'pamayanan',
          'tiyak na paksang may tuon sa nilalaman',
        ],
        recognize_competencies: null,
        delivery_mode: null,
        duration: null,
        expected_output: null,
        start_date: null,
        finished_date: null,
        status: null,
        files: [
          {
            id: 'topic-6-file-1',
            title: 'Sarili at Pamilya',
            paragraphs: [
              'Layunin: Natutukoy ang mga salitang madalas gamitin tungkol sa sarili at pamilya.',
              'Kabilang dito ang mga salitang tumutukoy sa pangalan, edad, tirahan, at mga kasapi ng pamilya tulad ng nanay, tatay, ate, kuya, at bunso.',
            ],
          },
          {
            id: 'topic-6-file-2',
            title: 'Pamayanan',
            paragraphs: [
              'Layunin: Natutukoy ang mga salitang madalas gamitin sa pamayanan.',
              'Kabilang dito ang mga lugar at tao sa komunidad gaya ng barangay, paaralan, palengke, simbahan, guro, at kapitan.',
            ],
          },
          {
            id: 'topic-6-file-3',
            title: 'Tiyak na Paksang May Tuon sa Nilalaman',
            paragraphs: [
              'Layunin: Natutukoy ang mga salitang madalas gamitin sa tiyak na paksang may tuon sa nilalaman.',
              'Tinatalakay dito ang mga bokabularyong ginagamit sa kalusugan, kabuhayan, kapaligiran, at pang-araw-araw na gawain.',
            ],
          },
        ],
      },
      {
        id: 'topic-7',
        title: '7. natutukoy ang mga bahagi ng pananalita sa pagpapahayag',
        sub_topics: [
          'pangngalan (uri ng pangngalan, anyo ng pangngalan, kayarian ng pangngalan)',
          'panghalip',
          'pandiwa',
          'pang-uri',
          'pang-abay',
          'pangatnig',
          'pang-ukol',
          'pang-angkop',
        ],
        recognize_competencies: null,
        delivery_mode: null,
        duration: null,
        expected_output: null,
        start_date: null,
        finished_date: null,
        status: null,
        files: [
          {
            id: 'topic-7-file-1',
            title: 'Pangngalan (Uri, Anyo, at Kayarian)',
            paragraphs: [
              'Ang pangngalan ay salitang tumutukoy sa ngalan ng tao, bagay, hayop, lugar, o pangyayari.',
              'Saklaw nito ang uri (pantangi at pambalana), anyo (tahas, basal, lansakan), at kayarian (payak, maylapi, inuulit, tambalan).',
            ],
          },
          {
            id: 'topic-7-file-2',
            title: 'Panghalip',
            paragraphs: [
              'Ang panghalip ay bahagi ng pananalita na inihahalili o ipinapalit sa pangngalan upang maiwasan ang paulit-ulit na pagbanggit nito (hal. ako, ikaw, siya, tayo, sila).',
            ],
          },
          {
            id: 'topic-7-file-3',
            title: 'Pandiwa',
            paragraphs: [
              'Ang pandiwa ay salitang nagsasaad ng kilos o galaw sa loob ng pangungusap (hal. nagbabasa, sumusulat, nagluluto).',
            ],
          },
          {
            id: 'topic-7-file-4',
            title: 'Pang-uri',
            paragraphs: [
              'Ang pang-uri ay salitang naglalarawan o nagbibigay-turing sa pangngalan o panghalip (hal. masipag, malinis, tatlo).',
            ],
          },
          {
            id: 'topic-7-file-5',
            title: 'Pang-abay',
            paragraphs: [
              'Ang pang-abay ay salitang nagbibigay-turing sa pandiwa, pang-uri, o kapwa pang-abay (hal. kahapon, sa paaralan, nang mabilis).',
            ],
          },
          {
            id: 'topic-7-file-6',
            title: 'Pangatnig',
            paragraphs: [
              'Ang pangatnig ay mga kataga o salitang nag-uugnay ng dalawang salita, parirala, o sugnay (hal. at, ngunit, dahil, upang).',
            ],
          },
          {
            id: 'topic-7-file-7',
            title: 'Pang-ukol',
            paragraphs: [
              'Ang pang-ukol ay nag-uugnay sa isang pangngalan sa iba pang salita sa pangungusap (hal. para sa, ayon kay, tungkol sa).',
            ],
          },
          {
            id: 'topic-7-file-8',
            title: 'Pang-angkop',
            paragraphs: [
              'Ang pang-angkop ay mga katagang nag-uugnay sa panuring at salitang tinuturingan upang maging madulas ang pagbigkas (na, -ng, -g).',
            ],
          },
        ],
      },
      {
        id: 'topic-8',
        title: '8. natutukoy sa binasang teksto ang mga salitang:',
        sub_topics: ['magkasingkahulugan', 'magkasalungat'],
        recognize_competencies: null,
        delivery_mode: null,
        duration: null,
        expected_output: null,
        start_date: null,
        finished_date: null,
        status: null,
        files: [
          {
            id: 'topic-8-file-1',
            title: 'Magkasingkahulugan',
            paragraphs: [
              'Layunin: Natutukoy sa binasang teksto ang mga salitang magkasingkahulugan.',
              'Ang mga salitang magkasingkahulugan ay may pareho o halos magkatulad na ibig sabihin (hal. maganda at marikit, masaya at maligaya).',
            ],
          },
          {
            id: 'topic-8-file-2',
            title: 'Magkasalungat',
            paragraphs: [
              'Layunin: Natutukoy sa binasang teksto ang mga salitang magkasalungat.',
              'Ang mga salitang magkasalungat ay may magkabaligtaran na kahulugan (hal. mataas at mababa, mainit at malamig).',
            ],
          },
        ],
      },
      {
        id: 'topic-9',
        title: '9. natutukoy ang pangngungusap at di pangungusap sa tekstong nabasa',
        sub_topics: [],
        recognize_competencies: null,
        delivery_mode: null,
        duration: null,
        expected_output: null,
        start_date: null,
        finished_date: null,
        status: null,
        files: [
          {
            id: 'topic-9-file-1',
            title: 'Pangungusap at Di-Pangungusap',
            paragraphs: [
              'Layunin: Natutukoy ang pangungusap at di-pangungusap sa tekstong nabasa.',
              'Ang pangungusap ay lipon ng mga salita na may buong diwa, nagsisimula sa malaking titik, at nagtatapos sa tamang bantas. Ang di-pangungusap (parirala) ay lipon ng mga salita na walang buong diwa.',
            ],
          },
        ],
      },
      {
        id: 'topic-10',
        title: '10. natutukoy ang mga uri ng pangungusap ayon sa gamit:',
        sub_topics: [
          'Paturol o Pasalaysay',
          'Patanong',
          'Pakiusap',
          'Pautos',
          'Padamdam',
        ],
        recognize_competencies: null,
        delivery_mode: null,
        duration: null,
        expected_output: null,
        start_date: null,
        finished_date: null,
        status: null,
        files: [
          {
            id: 'topic-10-file-1',
            title: 'Paturol o Pasalaysay',
            paragraphs: [
              'Nagpapahayag ng katotohanan, impormasyon, o salaysay at nagtatapos sa tuldok (.).',
            ],
          },
          {
            id: 'topic-10-file-2',
            title: 'Patanong',
            paragraphs: [
              'Nag-uusisa o nagtatanong ng impormasyon at nagtatapos sa tandang pananong (?).',
            ],
          },
          {
            id: 'topic-10-file-3',
            title: 'Pakiusap',
            paragraphs: [
              'Nakikiusap nang magalang gamit ang mga salitang "paki-" o "maaari ba" at nagtatapos sa tuldok (.) o tandang pananong (?).',
            ],
          },
          {
            id: 'topic-10-file-4',
            title: 'Pautos',
            paragraphs: [
              'Nagbibigay ng utos o direksyon upang gawin ang isang bagay at nagtatapos sa tuldok (.).',
            ],
          },
          {
            id: 'topic-10-file-5',
            title: 'Padamdam',
            paragraphs: [
              'Nagpapahayag ng matinding damdamin gaya ng tuwa, gulat, o lungkot at nagtatapos sa tandang padamdam (!).',
            ],
          },
        ],
      },
      {
        id: 'topic-11',
        title:
          '11. natutkoy ang hugnayang pangungusap na naglalarawan ng karanasan tungkol sa:',
        sub_topics: ['sarili at bansa', 'tiyak na paksang may tuon sa nilalaman'],
        recognize_competencies: null,
        delivery_mode: null,
        duration: null,
        expected_output: null,
        start_date: null,
        finished_date: null,
        status: null,
        files: [
          {
            id: 'topic-11-file-1',
            title: 'Sarili at Bansa',
            paragraphs: [
              'Layunin: Natutukoy ang hugnayang pangungusap na naglalarawan ng karanasan tungkol sa sarili at bansa.',
              'Ang hugnayang pangungusap ay binubuo ng isang sugnay na makapag-iisa at isa o higit pang sugnay na di-makapag-iisa.',
            ],
          },
          {
            id: 'topic-11-file-2',
            title: 'Tiyak na Paksang May Tuon sa Nilalaman',
            paragraphs: [
              'Layunin: Natutukoy ang hugnayang pangungusap na may tuon sa tiyak na paksa o nilalaman.',
              'Ginagamit ang mga pangatnig gaya ng "dahil", "kapag", "upang", at "kung" sa pagbuo ng hugnayang pangungusap.',
            ],
          },
        ],
      },
      {
        id: 'topic-12',
        title: '12. nauunawaan ang napakinggan o nabasang naratibong teksto',
        sub_topics: [],
        recognize_competencies: null,
        delivery_mode: null,
        duration: null,
        expected_output: null,
        start_date: null,
        finished_date: null,
        status: null,
        files: [
          {
            id: 'topic-12-file-1',
            title: 'Pag-unawa sa Naratibong Teksto',
            paragraphs: [
              'Layunin: Nauunawaan ang napakinggan o nabasang naratibong teksto.',
              'Tinutukoy sa araling ito ang mga elemento ng kuwento tulad ng tauhan, tagpuan, banghay (simula, gitna, wakas), at aral ng binasang akda.',
            ],
          },
        ],
      },
      {
        id: 'topic-13',
        title:
          '13. nauunawaan ang napakinggan o nabasang tekstong impormatibo (patalastas, babala, balita, at ulat panahon kaugnay sa kapaligiran)',
        sub_topics: [],
        recognize_competencies: null,
        delivery_mode: null,
        duration: null,
        expected_output: null,
        start_date: null,
        finished_date: null,
        status: null,
        files: [
          {
            id: 'topic-13-file-1',
            title: 'Tekstong Impormatibo (Patalastas, Babala, Balita, at Ulat Panahon)',
            paragraphs: [
              'Layunin: Nauunawaan ang napakinggan o nabasang tekstong impormatibo kaugnay sa kapaligiran.',
              'Saklaw nito ang pagsusuri sa mahahalagang detalye mula sa mga patalastas, babala, balita, at ulat panahon upang makagawa ng tamang hakbang at pag-iingat.',
            ],
          },
        ],
      },
      {
        id: 'topic-14',
        title: '14. natutukoy ang magagalang na mga pananalita sa pakikikag usap sa kapuwa.',
        sub_topics: [],
        recognize_competencies: null,
        delivery_mode: null,
        duration: null,
        expected_output: null,
        start_date: null,
        finished_date: null,
        status: null,
        files: [
          {
            id: 'topic-14-file-1',
            title: 'Magagalang na Pananalita',
            paragraphs: [
              'Layunin: Natutukoy ang magagalang na mga pananalita sa pakikipag-usap sa kapuwa.',
              'Pagsasanay sa paggamit ng "po" at "opo", pagbati ("Magandang umaga po"), paghingi ng pahintulot, at pagpapasalamat sa pakikipagkapuwa.',
            ],
          },
        ],
      },
      {
        id: 'topic-15',
        title: '15. natutukoy ang iba’t ibang bahagi ng isang talata',
        sub_topics: [],
        recognize_competencies: null,
        delivery_mode: null,
        duration: null,
        expected_output: null,
        start_date: null,
        finished_date: null,
        status: null,
        files: [
          {
            id: 'topic-15-file-1',
            title: 'Mga Bahagi ng Talata',
            paragraphs: [
              'Layunin: Natutukoy ang iba’t ibang bahagi ng isang talata.',
              'Ang isang maayos na talata ay binubuo ng panimulang pangungusap (paksang pangungusap), mga pantulong na detalye sa gitnang bahagi, at pangwakas na pangungusap.',
            ],
          },
        ],
      },
    ],
  },
];