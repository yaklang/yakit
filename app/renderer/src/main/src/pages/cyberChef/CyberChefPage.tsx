export interface CyberChefProp {}

export const CyberChefPage: React.FC<CyberChefProp> = (props) => {
  return <iframe 
    title="CyberChef"
    src="/cyberchef/CyberChef_v10.5.2.html"
    style={{width: "100%", height: "100%",margin:0,padding:0,border:0}}
    seamless
    />
}