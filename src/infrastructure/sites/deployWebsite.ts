import { WebsiteData } from "../../../types";

export const deployWebsite = async (site: WebsiteData): Promise<string> => {
  return new Promise((resolve) => setTimeout(() => resolve(`https://${site.subdomain}.coredna.sites.ai`), 2000));
};
