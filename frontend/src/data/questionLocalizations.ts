export type SupportedQuestionLanguage = 'en' | 'ta' | 'hi';

export interface QuestionLocalization {
  label: string;
  name: string;
  nativeName: string;
  flag: string;
  sections: {
    basicsTitle: string;
    basicsSubtitle: string;
    storyTitle: string;
    storySubtitle: string;
    craftTitle: string;
    craftSubtitle: string;
    pricingTitle: string;
    pricingSubtitle: string;
    photosTitle: string;
    photosSubtitle: string;
  };
  questions: {
    productNameQuestion: string;
    productNamePlaceholder: string;
    productNameHelper: string;

    descriptionQuestion: string;
    descriptionPlaceholder: string;
    descriptionHelper: string;

    categoryQuestion: string;
    subcategoryQuestion: string;

    materialQuestion: string;
    materialPlaceholder: string;

    colorQuestion: string;
    colorPlaceholder: string;

    craftTypeQuestion: string;
    craftTypePlaceholder: string;

    featuresQuestion: string;
    featuresHelper: string;

    priceQuestion: string;
    pricePlaceholder: string;
    priceHelper: string;

    stockQuestion: string;
    stockPlaceholder: string;
    stockHelper: string;
  };
  actions: {
    speak: string;
    recording: string;
    stop: string;
    processing: string;
    suggestedByM63: string;
    takePhoto: string;
    uploadPhoto: string;
    photoTipsTitle: string;
    photoTips: string[];
    saveDraft: string;
    reviewProduct: string;
    publishProduct: string;
    speakAgain: string;
    enterManually: string;
    needsClarification: string;
  };
}

export const QUESTION_LOCALIZATIONS: Record<SupportedQuestionLanguage, QuestionLocalization> = {
  en: {
    label: 'English',
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
    sections: {
      basicsTitle: 'Product Name',
      basicsSubtitle: 'Give your craft creation a clear, memorable name',
      storyTitle: 'Product Story & Description',
      storySubtitle: 'Describe the heritage, materials, and creation process',
      craftTitle: 'Craft Details & Materials',
      craftSubtitle: 'Specify craft category, material, and technique',
      pricingTitle: 'Pricing & Available Stock',
      pricingSubtitle: 'Set a fair price and stock quantity for your item',
      photosTitle: 'Product Photos',
      photosSubtitle: 'Add clear images of your product from good angles',
    },
    questions: {
      productNameQuestion: "What is your product's name?",
      productNamePlaceholder: 'e.g. Handwoven Chanderi Cotton Saree',
      productNameHelper: 'Give your product a clear, descriptive name.',

      descriptionQuestion: 'Tell customers about your product story and details',
      descriptionPlaceholder: 'Describe how it was crafted, the inspiration, or care instructions...',
      descriptionHelper: 'Describe the craft story and unique details of this item.',

      categoryQuestion: 'Craft Category',
      subcategoryQuestion: 'Subcategory',

      materialQuestion: 'What material is this made of?',
      materialPlaceholder: 'e.g. 100% Pure Cotton, Mulberry Silk',

      colorQuestion: 'Primary Color',
      colorPlaceholder: 'e.g. Crimson Red with Gold Zari',

      craftTypeQuestion: 'What craft technique was used?',
      craftTypePlaceholder: 'e.g. Handloom Weaving, Block Printing',

      featuresQuestion: 'What are the special features & craft highlights?',
      featuresHelper: 'Add features like Lightweight, Natural Dye, Gold Border',

      priceQuestion: 'What is the selling price (in Rupees)?',
      pricePlaceholder: 'e.g. 2000',
      priceHelper: 'Enter numerical selling price.',

      stockQuestion: 'How many items are currently available in stock?',
      stockPlaceholder: 'e.g. 10',
      stockHelper: 'Available quantity in workshop.',
    },
    actions: {
      speak: 'Speak',
      recording: 'Recording...',
      stop: 'Stop',
      processing: 'M63 Understanding...',
      suggestedByM63: 'Suggested by M63',
      takePhoto: 'Take Photo',
      uploadPhoto: 'Upload Photo',
      photoTipsTitle: 'Product photo tips',
      photoTips: [
        'Use bright, natural lighting',
        'Keep the entire product clearly visible',
        'Avoid blurry images or heavy shadows',
        'Prefer a clean, uncluttered background',
      ],
      saveDraft: 'Save as Draft',
      reviewProduct: 'Review Product',
      publishProduct: 'Publish Product',
      speakAgain: 'Speak Again',
      enterManually: 'Enter Manually',
      needsClarification: 'M63 needs clarification',
    },
  },
  ta: {
    label: 'தமிழ் (Tamil)',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    flag: '🇮🇳',
    sections: {
      basicsTitle: 'தயாரிப்பு பெயர்',
      basicsSubtitle: 'உங்கள் தயாரிப்புக்கு ஒரு தெளிவான பெயரைத் தரவும்',
      storyTitle: 'தயாரிப்பு கதை மற்றும் விவரம்',
      storySubtitle: 'தயாரிப்பின் பாரம்பரியம் மற்றும் உருவாக்க முறையை விளக்குங்கள்',
      craftTitle: 'கைவினை விவரங்கள் மற்றும் பொருட்கள்',
      craftSubtitle: 'கைவினைப் பிரிவு, பொருள் மற்றும் தொழில்நுட்பத்தைக் குறிப்பிடுங்கள்',
      pricingTitle: 'விலை மற்றும் கையிருப்பு',
      pricingSubtitle: 'நியாயமான விலை மற்றும் கையிருப்பு எண்ணிக்கையை நிர்ணயிக்கவும்',
      photosTitle: 'தயாரிப்பு புகைப்படங்கள்',
      photosSubtitle: 'நல்ல வெளிச்சத்தில் தயாரிப்புப் படங்களைச் சேர்க்கவும்',
    },
    questions: {
      productNameQuestion: 'உங்கள் தயாரிப்பின் பெயர் என்ன?',
      productNamePlaceholder: 'எ.கா. கைத்தறி பருத்தி சேலை',
      productNameHelper: 'உங்கள் தயாரிப்புக்குத் தெளிவான பெயரைக் கொடுங்கள்.',

      descriptionQuestion: 'உங்கள் தயாரிப்பைப் பற்றி வாடிக்கையாளர்களிடம் கூறுங்கள்',
      descriptionPlaceholder: 'இது எவ்வாறு நெய்யப்பட்டது அல்லது உருவாக்கப்பட்டது என்று பேசுங்கள்...',
      descriptionHelper: 'கைவினைப் பாரம்பரியம் மற்றும் சிறப்பு அம்சங்களை விவரிக்கவும்.',

      categoryQuestion: 'கைவினைப் பிரிவு (Category)',
      subcategoryQuestion: 'துணைப் பிரிவு (Subcategory)',

      materialQuestion: 'இது எந்தப் பொருளால் செய்யப்பட்டது?',
      materialPlaceholder: 'எ.கா. தூய பருத்தி (Pure Cotton)',

      colorQuestion: 'முக்கிய வண்ணம் (Color)',
      colorPlaceholder: 'எ.கா. சிவப்பு மற்றும் தங்கம்',

      craftTypeQuestion: 'என்ன கைவினைத் தொழில்நுட்பம் பயன்படுத்தப்பட்டது?',
      craftTypePlaceholder: 'எ.கா. கைத்தறி நெசவு (Handloom Weaving)',

      featuresQuestion: 'சிறப்பு அம்சங்கள் மற்றும் சிறப்பம்சங்கள் என்ன?',
      featuresHelper: 'எடை குறைவானது, இயற்கை சாயம் போன்ற சிறப்புகளைச் சேர்க்கவும்',

      priceQuestion: 'விற்பனை விலை எவ்வளவு (ரூபாயில்)?',
      pricePlaceholder: 'எ.கா. 2000',
      priceHelper: 'எண் வடிவில் விலையைக் குறிப்பிடவும்.',

      stockQuestion: 'எத்தனை பொருட்கள் கையிருப்பில் உள்ளன?',
      stockPlaceholder: 'எ.கா. 10',
      stockHelper: 'பட்டறையில் உள்ள தற்போதைய எண்ணிக்கை.',
    },
    actions: {
      speak: 'பேசவும்',
      recording: 'பதிவாகிறது...',
      stop: 'நிறுத்து',
      processing: 'M63 பகுப்பாய்வு செய்கிறது...',
      suggestedByM63: 'M63 பரிந்துரைத்தது',
      takePhoto: 'படம் எடுக்கவும்',
      uploadPhoto: 'படம் பதிவேற்றவும்',
      photoTipsTitle: 'புகைப்பட குறிப்புகள்',
      photoTips: [
        'நல்ல வெளிச்சத்தைப் பயன்படுத்தவும்',
        'முழு தயாரிப்பும் தெளிவாகத் தெரிய வேண்டும்',
        'மங்கலான படங்களைத் தவிர்க்கவும்',
        'தெளிவான பின்னணியைத் தேர்ந்தெடுக்கவும்',
      ],
      saveDraft: 'வரைவாகச் சேமி',
      reviewProduct: 'மதிப்பாய்வு செய்',
      publishProduct: 'வெளியிடு',
      speakAgain: 'மீண்டும் பேசவும்',
      enterManually: 'கைமுறையாக உள்ளிடவும்',
      needsClarification: 'M63 க்கு தெளிவுபடுத்தல் தேவை',
    },
  },
  hi: {
    label: 'हिन्दी (Hindi)',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    flag: '🇮🇳',
    sections: {
      basicsTitle: 'उत्पाद का नाम',
      basicsSubtitle: 'अपने शिल्प उत्पाद को एक स्पष्ट नाम दें',
      storyTitle: 'उत्पाद की कहानी और विवरण',
      storySubtitle: 'शिल्प की विरासत और निर्माण प्रक्रिया का वर्णन करें',
      craftTitle: 'शिल्प विवरण और सामग्री',
      craftSubtitle: 'शिल्प श्रेणी, सामग्री और तकनीक निर्दिष्ट करें',
      pricingTitle: 'मूल्य निर्धारण और स्टॉक',
      pricingSubtitle: 'अपने उत्पाद के लिए उचित मूल्य और मात्रा निर्धारित करें',
      photosTitle: 'उत्पाद की तस्वीरें',
      photosSubtitle: 'अच्छी रोशनी में अपने उत्पाद की स्पष्ट तस्वीरें जोड़ें',
    },
    questions: {
      productNameQuestion: 'आपके उत्पाद का नाम क्या है?',
      productNamePlaceholder: 'उदा. हथकरघा सूती साड़ी',
      productNameHelper: 'अपने उत्पाद को एक स्पष्ट नाम दें।',

      descriptionQuestion: 'ग्राहकों को अपने उत्पाद की कहानी बताएं',
      descriptionPlaceholder: 'बताएं कि इसे कैसे बनाया गया और इसकी क्या विशेषता है...',
      descriptionHelper: 'शिल्प की कहानी और विवरण बताएं।',

      categoryQuestion: 'शिल्प श्रेणी (Category)',
      subcategoryQuestion: 'उप-श्रेणी (Subcategory)',

      materialQuestion: 'यह किस सामग्री से बना है?',
      materialPlaceholder: 'उदा. 100% शुद्ध सूती (Pure Cotton)',

      colorQuestion: 'मुख्य रंग (Color)',
      colorPlaceholder: 'उदा. लाल और सुनहरा',

      craftTypeQuestion: 'किस शिल्प तकनीक का उपयोग किया गया था?',
      craftTypePlaceholder: 'उदा. हथकरघा बुनाई (Handloom Weaving)',

      featuresQuestion: 'विशेष विशेषताएं और मुख्य आकर्षण क्या हैं?',
      featuresHelper: 'हल्का, प्राकृतिक रंग जैसी विशेषताएं जोड़ें',

      priceQuestion: 'बिक्री मूल्य क्या है (रुपये में)?',
      pricePlaceholder: 'उदा. 2000',
      priceHelper: 'केवल संख्यात्मक मूल्य दर्ज करें।',

      stockQuestion: 'वर्तमान में स्टॉक में कितने पीस उपलब्ध हैं?',
      stockPlaceholder: 'उदा. 10',
      stockHelper: 'वर्कशॉप में उपलब्ध मात्रा।',
    },
    actions: {
      speak: 'बोलें',
      recording: 'रिकॉर्डिंग...',
      stop: 'रोकें',
      processing: 'M63 समझ रहा है...',
      suggestedByM63: 'M63 द्वारा सुझाया गया',
      takePhoto: 'फोटो लें',
      uploadPhoto: 'फोटो अपलोड करें',
      photoTipsTitle: 'फोटो टिप्स',
      photoTips: [
        'अच्छी और प्राकृतिक रोशनी का उपयोग करें',
        'पूरा उत्पाद स्पष्ट रूप से दिखाई देना चाहिए',
        'धुंधली तस्वीरों से बचें',
        'साफ पृष्ठभूमि चुनें',
      ],
      saveDraft: 'ड्राफ्ट सहेजें',
      reviewProduct: 'समीक्षा करें',
      publishProduct: 'प्रकाशित करें',
      speakAgain: 'फिर से बोलें',
      enterManually: 'मैन्युअल रूप से दर्ज करें',
      needsClarification: 'M63 को स्पष्टीकरण चाहिए',
    },
  },
};
