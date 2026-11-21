import { useEffect } from 'react';

interface MetaProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
}

export function usePageMeta({
  title,
  description,
  keywords,
  ogTitle,
  ogDescription,
  ogImage,
}: MetaProps) {
  useEffect(() => {
    // 1. Update document title
    const fullTitle = title
      ? `${title} | MOVEX — Moving Things Together`
      : 'MOVEX — Moving Things Together';
    document.title = fullTitle;

    // Helper to set or create meta tag
    const setMetaTag = (attribute: string, attrValue: string, content: string) => {
      let element = document.querySelector(`meta[${attribute}="${attrValue}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, attrValue);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // 2. Meta description
    if (description) {
      setMetaTag('name', 'description', description);
    }

    // 3. Meta keywords
    if (keywords) {
      setMetaTag('name', 'keywords', keywords);
    }

    // 4. Open Graph tags
    if (ogTitle || title) {
      setMetaTag('property', 'og:title', ogTitle || fullTitle);
    }
    if (ogDescription || description) {
      setMetaTag('property', 'og:description', ogDescription || description || '');
    }
    if (ogImage) {
      setMetaTag('property', 'og:image', ogImage);
    }

    // 5. Twitter Card
    setMetaTag('name', 'twitter:title', ogTitle || fullTitle);
    if (ogDescription || description) {
      setMetaTag('name', 'twitter:description', ogDescription || description || '');
    }
  }, [title, description, keywords, ogTitle, ogDescription, ogImage]);
}
