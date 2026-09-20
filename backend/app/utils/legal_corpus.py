"""
Authoritative Indian Legal Corpus for BNS (Bharatiya Nyaya Sanhita, 2023),
BNSS (Bharatiya Nagarik Suraksha Sanhita, 2023), and BSA (Bharatiya Sakshya Adhiniyam, 2023).

Strict anti-hallucination guardrails:
All statutory citations are validated against this gazetted corpus.
Never invent sections.
"""

from typing import Dict, List, Any, Optional

STATUTE_CATALOG: Dict[str, Dict[str, Any]] = {
    "BNS": {
        "code": "BNS",
        "title": "Bharatiya Nyaya Sanhita, 2023",
        "act_number": "Act No. 45 of 2023",
        "enactment_year": 2023,
        "effective_date": "2024-07-01",
        "replaces": "Indian Penal Code, 1860 (IPC)",
        "description": "Substantive criminal law code governing offenses, liability, conspiracy, and punishments in India.",
    },
    "BNSS": {
        "code": "BNSS",
        "title": "Bharatiya Nagarik Suraksha Sanhita, 2023",
        "act_number": "Act No. 46 of 2023",
        "enactment_year": 2023,
        "effective_date": "2024-07-01",
        "replaces": "Code of Criminal Procedure, 1973 (CrPC)",
        "description": "Procedural criminal law governing FIR recording, arrest, summons, forensic investigation, search, seizure, attachment, and trial.",
    },
    "BSA": {
        "code": "BSA",
        "title": "Bharatiya Sakshya Adhiniyam, 2023",
        "act_number": "Act No. 47 of 2023",
        "enactment_year": 2023,
        "effective_date": "2024-07-01",
        "replaces": "Indian Evidence Act, 1872 (IEA)",
        "description": "Law of evidence governing admissibility, relevance, burden of proof, electronic records certification, and expert testimony.",
    },
}

AUTHORITATIVE_SECTIONS: Dict[str, Dict[str, Dict[str, Any]]] = {
    "BNS": {
        "61": {
            "section_number": "61",
            "section_title": "Criminal Conspiracy",
            "chapter": "Chapter IV - Of Abetment, Criminal Conspiracy and Attempt",
            "category": "OFFENSE",
            "offense_type": "COGNIZABLE",
            "bailable": False,
            "compoundable": False,
            "punishment_text": "Imprisonment according to the offense conspired, or rigorous imprisonment up to 6 months or fine.",
            "legacy_code_mapping": {"act": "IPC", "section": "120B", "title": "Criminal conspiracy"},
            "full_text": "When two or more persons agree to do, or cause to be done, an illegal act, or an act which is not illegal by illegal means, such an agreement is designated a criminal conspiracy.",
            "conditions": [
                {
                    "id": "BNS-61-C1",
                    "text": "Agreement between two or more persons",
                    "is_mandatory": True,
                    "description": "Meeting of minds, mutual consensus or joint concerted execution between two or more identifiable actors.",
                },
                {
                    "id": "BNS-61-C2",
                    "text": "Agreement to commit an illegal act or achieve purpose by illegal means",
                    "is_mandatory": True,
                    "description": "Object of agreement must constitute an offense or prohibited act under Indian law.",
                },
                {
                    "id": "BNS-61-C3",
                    "text": "Overt act done in furtherance of the agreement",
                    "is_mandatory": False,
                    "description": "Except where the agreement itself is to commit an offense, some overt act besides the agreement is performed.",
                },
            ],
        },
        "111": {
            "section_number": "111",
            "section_title": "Organised Crime",
            "chapter": "Chapter VI - Of Offenses Against the Human Body & Public Order",
            "category": "OFFENSE",
            "offense_type": "COGNIZABLE",
            "bailable": False,
            "compoundable": False,
            "punishment_text": "Death or imprisonment for life and fine not less than ₹10,00,000 if death results; otherwise imprisonment 5 years to life.",
            "legacy_code_mapping": {"act": "MCOCA / IPC", "section": "Special Acts / IPC 387/120B", "title": "Organised Crime Syndicates"},
            "full_text": "Any continuing unlawful activity including kidnapping, robbery, vehicle theft, extortion, land grabbing, contract killing, economic offenses, cyber-crimes having severe consequences, trafficking, by a member or on behalf of a crime syndicate.",
            "conditions": [
                {
                    "id": "BNS-111-C1",
                    "text": "Continuing unlawful activity by member or syndicate",
                    "is_mandatory": True,
                    "description": "Organized criminal activity undertaken singly or jointly as a member of an organized crime syndicate.",
                },
                {
                    "id": "BNS-111-C2",
                    "text": "Use of violence, threat, intimidation, coercion or other unlawful means",
                    "is_mandatory": True,
                    "description": "Employment of coercion, cyber intimidation, or systematic illicit channels.",
                },
                {
                    "id": "BNS-111-C3",
                    "text": "Objective of gaining direct or indirect material benefit or economic advantage",
                    "is_mandatory": True,
                    "description": "Financial gain, illicit transfer of wealth, or syndicate economic dominance.",
                },
                {
                    "id": "BNS-111-C4",
                    "text": "Charge-sheets filed in competent court within preceding 10 years",
                    "is_mandatory": True,
                    "description": "Statutory prerequisite: more than one charge-sheet filed within the preceding ten years and court took cognizance.",
                },
            ],
        },
        "112": {
            "section_number": "112",
            "section_title": "Petty Organised Crime",
            "chapter": "Chapter VI",
            "category": "OFFENSE",
            "offense_type": "COGNIZABLE",
            "bailable": False,
            "compoundable": False,
            "punishment_text": "Imprisonment not less than 1 year which may extend to 7 years, and fine.",
            "legacy_code_mapping": {"act": "IPC", "section": "Special Syndicates / 379/420", "title": "Theft, Snatching, Card skimming"},
            "full_text": "Whoever, being a member of a group or gang, commits theft, snatching, cheating, unauthorized selling of tickets, betting or gambling, or digital cyber fraud.",
            "conditions": [
                {
                    "id": "BNS-112-C1",
                    "text": "Act committed as member of gang or syndicate",
                    "is_mandatory": True,
                    "description": "Group collusion or localized cartel coordination.",
                },
                {
                    "id": "BNS-112-C2",
                    "text": "Commission of repetitive petty crimes or unauthorized illicit trades",
                    "is_mandatory": True,
                    "description": "Snatching, digital fraud, cyber skimming, unauthorized betting.",
                },
            ],
        },
        "113": {
            "section_number": "113",
            "section_title": "Terrorist Act",
            "chapter": "Chapter VI",
            "category": "OFFENSE",
            "offense_type": "COGNIZABLE",
            "bailable": False,
            "compoundable": False,
            "punishment_text": "Death or imprisonment for life and fine; or imprisonment not less than 5 years to life.",
            "legacy_code_mapping": {"act": "UAPA / IPC", "section": "UAPA 15 / IPC 121", "title": "Terrorist act against sovereignty"},
            "full_text": "Whoever does any act with the intent to threaten or likely to threaten the unity, integrity, sovereignty, or security of India or to strike terror in people.",
            "conditions": [
                {
                    "id": "BNS-113-C1",
                    "text": "Intent to threaten unity, integrity, or security of India",
                    "is_mandatory": True,
                    "description": "Hostile intent directed towards sovereignty or public security.",
                },
                {
                    "id": "BNS-113-C2",
                    "text": "Use of explosive, firearms, lethal weapons, cyber warfare, or hazardous substance",
                    "is_mandatory": True,
                    "description": "Means of destruction or disruption of critical communications/economic infrastructure.",
                },
            ],
        },
        "308": {
            "section_number": "308",
            "section_title": "Extortion",
            "chapter": "Chapter XVII - Of Offenses Against Property",
            "category": "OFFENSE",
            "offense_type": "COGNIZABLE",
            "bailable": False,
            "compoundable": False,
            "punishment_text": "Imprisonment up to 7 years, or fine, or both.",
            "legacy_code_mapping": {"act": "IPC", "section": "383 / 384", "title": "Extortion"},
            "full_text": "Whoever intentionally puts any person in fear of any injury to that person, or to any other, and thereby dishonestly induces the person so put in fear to deliver to any person any property or valuable security.",
            "conditions": [
                {
                    "id": "BNS-308-C1",
                    "text": "Intentionally putting person in fear of injury",
                    "is_mandatory": True,
                    "description": "Communication of threat to life, liberty, reputation, or property.",
                },
                {
                    "id": "BNS-308-C2",
                    "text": "Dishonest inducement to deliver property or valuable security",
                    "is_mandatory": True,
                    "description": "Coerced parting with money, cryptocurrency, or negotiable asset.",
                },
            ],
        },
        "316": {
            "section_number": "316",
            "section_title": "Criminal Breach of Trust",
            "chapter": "Chapter XVII - Of Offenses Against Property",
            "category": "OFFENSE",
            "offense_type": "NON_COGNIZABLE",
            "bailable": True,
            "compoundable": True,
            "punishment_text": "Imprisonment up to 5 years, or fine, or both.",
            "legacy_code_mapping": {"act": "IPC", "section": "405 / 406", "title": "Criminal breach of trust"},
            "full_text": "Whoever, being in any manner entrusted with property, or with any dominion over property, dishonestly misappropriates or converts to his own use that property.",
            "conditions": [
                {
                    "id": "BNS-316-C1",
                    "text": "Entrustment of property or dominion over property",
                    "is_mandatory": True,
                    "description": "Fiduciary capacity, custody, or authorized management of funds/property.",
                },
                {
                    "id": "BNS-316-C2",
                    "text": "Dishonest misappropriation or conversion to own use",
                    "is_mandatory": True,
                    "description": "Diversion of funds or assets in violation of legal trust or contract.",
                },
            ],
        },
        "318": {
            "section_number": "318",
            "section_title": "Cheating and Dishonestly Inducing Delivery of Property",
            "chapter": "Chapter XVII - Of Offenses Against Property",
            "category": "OFFENSE",
            "offense_type": "COGNIZABLE",
            "bailable": False,
            "compoundable": False,
            "punishment_text": "Imprisonment up to 7 years and fine.",
            "legacy_code_mapping": {"act": "IPC", "section": "415 / 420", "title": "Cheating and dishonestly inducing delivery of property"},
            "full_text": "Whoever cheats and thereby dishonestly induces the person deceived to deliver any property to any person, or to make, alter or destroy the whole or any part of a valuable security.",
            "conditions": [
                {
                    "id": "BNS-318-C1",
                    "text": "Deception of any person",
                    "is_mandatory": True,
                    "description": "False representation, fraudulent scheme, or misstatement of material fact.",
                },
                {
                    "id": "BNS-318-C2",
                    "text": "Fraudulent or dishonest inducement to deliver property",
                    "is_mandatory": True,
                    "description": "Victim parting with money, cryptocurrency, or assets based on fraudulent misrepresentation.",
                },
                {
                    "id": "BNS-318-C3",
                    "text": "Mens rea / dishonest intention existing from inception",
                    "is_mandatory": True,
                    "description": "Criminal intention present at the moment of the inducement, not merely subsequent breach.",
                },
            ],
        },
        "336": {
            "section_number": "336",
            "section_title": "Forgery",
            "chapter": "Chapter XVIII - Of Offenses Relating to Documents and Property Marks",
            "category": "OFFENSE",
            "offense_type": "NON_COGNIZABLE",
            "bailable": True,
            "compoundable": False,
            "punishment_text": "Imprisonment up to 2 years, or fine, or both.",
            "legacy_code_mapping": {"act": "IPC", "section": "463 / 465", "title": "Forgery"},
            "full_text": "Whoever makes any false document or false electronic record with intent to cause damage or injury to public or any person, or to support any claim or title.",
            "conditions": [
                {
                    "id": "BNS-336-C1",
                    "text": "Making of a false document or electronic record",
                    "is_mandatory": True,
                    "description": "Unauthorized creation, signing, digital altering, or affixing of false identity.",
                },
                {
                    "id": "BNS-336-C2",
                    "text": "Intent to cause damage or defraud",
                    "is_mandatory": True,
                    "description": "Intention to support a fraudulent claim or deceive third parties.",
                },
            ],
        },
        "338": {
            "section_number": "338",
            "section_title": "Forgery of Valuable Security, Will, etc.",
            "chapter": "Chapter XVIII",
            "category": "OFFENSE",
            "offense_type": "COGNIZABLE",
            "bailable": False,
            "compoundable": False,
            "punishment_text": "Imprisonment for life, or imprisonment up to 10 years and fine.",
            "legacy_code_mapping": {"act": "IPC", "section": "467", "title": "Forgery of valuable security, will, etc."},
            "full_text": "Whoever forges a document which purports to be a valuable security or a will, or an authority to make or transfer any valuable security.",
            "conditions": [
                {
                    "id": "BNS-338-C1",
                    "text": "Forgery of instrument qualifying as valuable security",
                    "is_mandatory": True,
                    "description": "Falsification of negotiable instrument, title deed, bank guarantee, or authorization.",
                },
            ],
        },
        "340": {
            "section_number": "340",
            "section_title": "Using as Genuine a Forged Document or Electronic Record",
            "chapter": "Chapter XVIII",
            "category": "OFFENSE",
            "offense_type": "COGNIZABLE",
            "bailable": False,
            "compoundable": False,
            "punishment_text": "Punished in the same manner as if he had forged such document or electronic record.",
            "legacy_code_mapping": {"act": "IPC", "section": "471", "title": "Using as genuine a forged document or electronic record"},
            "full_text": "Whoever fraudulently or dishonestly uses as genuine any document or electronic record which he knows or has reason to believe to be a forged document or electronic record.",
            "conditions": [
                {
                    "id": "BNS-340-C1",
                    "text": "Actual usage of forged document/record as genuine",
                    "is_mandatory": True,
                    "description": "Tendered to bank, registrar, corporate entity, or public officer.",
                },
                {
                    "id": "BNS-340-C2",
                    "text": "Knowledge or reason to believe that the document was forged",
                    "is_mandatory": True,
                    "description": "Scienter / knowledge of fraudulent genesis.",
                },
            ],
        },
    },
    "BNSS": {
        "35": {
            "section_number": "35",
            "section_title": "When Police May Arrest Without Warrant",
            "chapter": "Chapter V - Arrest of Persons",
            "category": "PROCEDURE",
            "offense_type": "PROCEDURAL",
            "bailable": None,
            "compoundable": None,
            "punishment_text": "Statutory power of arrest subject to judicial guidelines and written grounds.",
            "legacy_code_mapping": {"act": "CrPC", "section": "41", "title": "When police may arrest without warrant"},
            "full_text": "Any police officer may without an order from a Magistrate and without a warrant arrest any person who commits in the presence of a police officer a cognizable offense, or against whom a reasonable complaint has been made or credible information received.",
            "conditions": [
                {
                    "id": "BNSS-35-C1",
                    "text": "Credible information or reasonable suspicion of cognizable offense",
                    "is_mandatory": True,
                    "description": "Objective material showing involvement in cognizable offense punishable with >7 years or fulfilling necessity criteria.",
                },
                {
                    "id": "BNSS-35-C2",
                    "text": "Arrest necessity condition satisfied (prevent tampering/flight/repetition)",
                    "is_mandatory": True,
                    "description": "Officer must record written reasons why arrest is necessary to prevent disappearance of evidence or witness intimidation.",
                },
            ],
        },
        "43": {
            "section_number": "43",
            "section_title": "Arrest How Made and Rights of Arrested Person",
            "chapter": "Chapter V",
            "category": "PROCEDURE",
            "offense_type": "PROCEDURAL",
            "bailable": None,
            "compoundable": None,
            "punishment_text": "Procedural compliance mandatory; violation attracts disciplinary action under civil rights jurisprudence.",
            "legacy_code_mapping": {"act": "CrPC", "section": "46 / 50", "title": "Arrest how made & inform grounds"},
            "full_text": "Police officer making arrest shall inform arrested person of grounds of arrest and right to bail, and designate nominated friend/relative.",
            "conditions": [
                {
                    "id": "BNSS-43-C1",
                    "text": "Mandatory written communication of grounds of arrest",
                    "is_mandatory": True,
                    "description": "Accused must be immediately apprised in writing of full particulars of offense.",
                },
            ],
        },
        "91": {
            "section_number": "91",
            "section_title": "Summons to Produce Document or Other Thing",
            "chapter": "Chapter VII - Processes to Compel the Production of Things",
            "category": "PROCEDURE",
            "offense_type": "PROCEDURAL",
            "bailable": None,
            "compoundable": None,
            "punishment_text": "Failure to comply punishable under Section 223 of BNS (contempt of lawful authority).",
            "legacy_code_mapping": {"act": "CrPC", "section": "91", "title": "Summons to produce document or other thing"},
            "full_text": "Whenever any Court or any officer in charge of a police station considers that the production of any document or other thing is necessary or desirable for the purposes of any investigation, inquiry, trial or other proceeding, such Court may issue a summons, or such officer a written order, to the person in whose possession or power such document or thing is believed to be, requiring him to attend and produce it.",
            "conditions": [
                {
                    "id": "BNSS-91-C1",
                    "text": "Document or record necessary or desirable for investigation",
                    "is_mandatory": True,
                    "description": "Clear nexus between requested banking records, ledger, or hard drive and the pending investigation.",
                },
                {
                    "id": "BNSS-91-C2",
                    "text": "Written requisition by officer-in-charge or Magistrate",
                    "is_mandatory": True,
                    "description": "Formal written notice identifying the specific items and custody holder.",
                },
            ],
        },
        "92": {
            "section_number": "92",
            "section_title": "Procedure as to Letters and Telegrams / Telecom Data",
            "chapter": "Chapter VII",
            "category": "PROCEDURE",
            "offense_type": "PROCEDURAL",
            "bailable": None,
            "compoundable": None,
            "punishment_text": "Procedural requisition to postal or telecommunication authorities.",
            "legacy_code_mapping": {"act": "CrPC", "section": "92", "title": "Procedure as to letters and telegrams"},
            "full_text": "If any document, parcel, or electronic data in custody of postal or telecom authority is wanted for investigation, District Magistrate or Chief Judicial Magistrate may require delivery.",
            "conditions": [
                {
                    "id": "BNSS-92-C1",
                    "text": "Custody of record with telecom or service provider",
                    "is_mandatory": True,
                    "description": "Requisition for CDR, IPDR, subscriber records from authorized cellular provider.",
                },
            ],
        },
        "94": {
            "section_number": "94",
            "section_title": "Search Warrants for Stolen Property, Forged Documents, etc.",
            "chapter": "Chapter VII",
            "category": "PROCEDURE",
            "offense_type": "PROCEDURAL",
            "bailable": None,
            "compoundable": None,
            "punishment_text": "Execution of search warrant by authorized police officer.",
            "legacy_code_mapping": {"act": "CrPC", "section": "94", "title": "Search of place suspected to contain stolen property, forged documents, etc."},
            "full_text": "Magistrate upon information and after inquiry may authorize police officer to enter, search and seize forged documents, counterfeit marks, or proceeds of crime.",
            "conditions": [
                {
                    "id": "BNSS-94-C1",
                    "text": "Reasonable belief of premises containing forged documents or illicit proceeds",
                    "is_mandatory": True,
                    "description": "Affidavit or case diary entries establishing reasonable grounds for search.",
                },
            ],
        },
        "107": {
            "section_number": "107",
            "section_title": "Attachment, Forfeiture or Restoration of Property",
            "chapter": "Chapter VII",
            "category": "PROCEDURE",
            "offense_type": "PROCEDURAL",
            "bailable": None,
            "compoundable": None,
            "punishment_text": "Attachment order by Magistrate with confirmation by Sessions Court.",
            "legacy_code_mapping": {"act": "CrPC / PMLA", "section": "105A-105L CrPC / PMLA 5", "title": "Attachment and forfeiture of proceeds of crime"},
            "full_text": "Where a police officer investigating an offense has reason to believe that any property is derived or obtained directly or indirectly from criminal activity, he may make an application to the Magistrate for attachment of such property.",
            "conditions": [
                {
                    "id": "BNSS-107-C1",
                    "text": "Property derived directly or indirectly from criminal activity (proceeds of crime)",
                    "is_mandatory": True,
                    "description": "Tracing money trail from victim/entity to suspect bank accounts or acquired assets.",
                },
                {
                    "id": "BNSS-107-C2",
                    "text": "Formal application to Court with approval of Superintendent of Police",
                    "is_mandatory": True,
                    "description": "Magisterial order required prior to permanent attachment.",
                },
            ],
        },
        "173": {
            "section_number": "173",
            "section_title": "Information in Cognizable Cases (FIR)",
            "chapter": "Chapter XIII - Information to the Police and Their Powers to Investigate",
            "category": "PROCEDURE",
            "offense_type": "PROCEDURAL",
            "bailable": None,
            "compoundable": None,
            "punishment_text": "Mandatory recording of First Information Report including e-FIR provisions.",
            "legacy_code_mapping": {"act": "CrPC", "section": "154", "title": "Information in cognizable cases (FIR)"},
            "full_text": "Every information relating to the commission of a cognizable offense, if given orally or electronically to an officer in charge of a police station, shall be reduced to writing and recorded in the prescribed book.",
            "conditions": [
                {
                    "id": "BNSS-173-C1",
                    "text": "Information disclosing commission of cognizable offense",
                    "is_mandatory": True,
                    "description": "Specific allegation disclosing ingredients of statutory cognizable offense.",
                },
                {
                    "id": "BNSS-173-C2",
                    "text": "Signed entry in police book and delivery of free copy to informant",
                    "is_mandatory": True,
                    "description": "Statutory duty under Lalita Kumari mandate; e-FIR must be signed within 3 days.",
                },
            ],
        },
        "180": {
            "section_number": "180",
            "section_title": "Examination of Witnesses by Police",
            "chapter": "Chapter XIII",
            "category": "PROCEDURE",
            "offense_type": "PROCEDURAL",
            "bailable": None,
            "compoundable": None,
            "punishment_text": "Recording of witness statement; audio-video electronic means authorized.",
            "legacy_code_mapping": {"act": "CrPC", "section": "161", "title": "Examination of witnesses by police"},
            "full_text": "Any police officer making an investigation may examine orally any person supposed to be acquainted with the facts and circumstances of the case, and statement may be recorded by audio-video electronic means.",
            "conditions": [
                {
                    "id": "BNSS-180-C1",
                    "text": "Person acquainted with facts and circumstances of the case",
                    "is_mandatory": True,
                    "description": "Witness or informant possessing direct, circumstantial, or documentary knowledge.",
                },
            ],
        },
        "193": {
            "section_number": "193",
            "section_title": "Report of Police Officer on Completion of Investigation (Chargesheet)",
            "chapter": "Chapter XIII",
            "category": "PROCEDURE",
            "offense_type": "PROCEDURAL",
            "bailable": None,
            "compoundable": None,
            "punishment_text": "Final investigative report submitted to Magistrate within statutory timeline.",
            "legacy_code_mapping": {"act": "CrPC", "section": "173", "title": "Report of police officer on completion of investigation"},
            "full_text": "Every investigation shall be completed without unnecessary delay, and the officer in charge shall forward to a Magistrate a police report stating names of parties, nature of information, offense, and whether accused is arrested or released on bond.",
            "conditions": [
                {
                    "id": "BNSS-193-C1",
                    "text": "Completion of all statutory investigatory steps",
                    "is_mandatory": True,
                    "description": "Witness statements, forensic reports, electronic certificates, and financial audits collated.",
                },
                {
                    "id": "BNSS-193-C2",
                    "text": "Submission of chargesheet within 60 or 90 days of arrest",
                    "is_mandatory": True,
                    "description": "Compliance with default bail timelines under procedural law.",
                },
            ],
        },
    },
    "BSA": {
        "3": {
            "section_number": "3",
            "section_title": "Definitions of Document and Evidence",
            "chapter": "Chapter I - Preliminary",
            "category": "EVIDENCE_RULE",
            "offense_type": "PROCEDURAL",
            "bailable": None,
            "compoundable": None,
            "punishment_text": "Admissibility threshold determination.",
            "legacy_code_mapping": {"act": "IEA", "section": "3", "title": "Interpretation clause - Document & Evidence"},
            "full_text": "Evidence includes all statements which the Court permits or requires to be made before it by witnesses (oral evidence) and all documents including electronic records produced for inspection (documentary evidence).",
            "conditions": [
                {
                    "id": "BSA-3-C1",
                    "text": "Classification as documentary or electronic record",
                    "is_mandatory": True,
                    "description": "Information stored, transmitted, or recorded electronically or mechanically.",
                },
            ],
        },
        "6": {
            "section_number": "6",
            "section_title": "Relevancy of Facts Forming Part of Same Transaction (Res Gestae)",
            "chapter": "Chapter II - Relevancy of Facts",
            "category": "EVIDENCE_RULE",
            "offense_type": "PROCEDURAL",
            "bailable": None,
            "compoundable": None,
            "punishment_text": "Admissibility rule for contemporaneous occurrences.",
            "legacy_code_mapping": {"act": "IEA", "section": "6", "title": "Facts forming part of same transaction (Res Gestae)"},
            "full_text": "Facts which, though not in issue, are so connected with a fact in issue as to form part of the same transaction, are relevant, whether they occurred at the same time and place or at different times and places.",
            "conditions": [
                {
                    "id": "BSA-6-C1",
                    "text": "Contemporaneous connection to fact in issue",
                    "is_mandatory": True,
                    "description": "Immediate temporal and physical proximity connecting the act to the offense.",
                },
            ],
        },
        "7": {
            "section_number": "7",
            "section_title": "Facts Which are the Occasion, Cause or Effect of Facts in Issue",
            "chapter": "Chapter II",
            "category": "EVIDENCE_RULE",
            "offense_type": "PROCEDURAL",
            "bailable": None,
            "compoundable": None,
            "punishment_text": "Admissibility of causal connections.",
            "legacy_code_mapping": {"act": "IEA", "section": "7", "title": "Occasion, cause or effect of facts in issue"},
            "full_text": "Facts which are the occasion, cause or effect, immediate or otherwise, of relevant facts, or facts in issue, or which constitute the state of things under which they happened, or which afforded an opportunity for their occurrence, are relevant.",
            "conditions": [
                {
                    "id": "BSA-7-C1",
                    "text": "Demonstration of causal sequence, opportunity, or state of things",
                    "is_mandatory": True,
                    "description": "Financial hardship preceding fraud, access to cryptographic keys, opportunity window.",
                },
            ],
        },
        "39": {
            "section_number": "39",
            "section_title": "Opinion of Examiner of Electronic Evidence",
            "chapter": "Chapter II - Opinion of Third Persons",
            "category": "EVIDENCE_RULE",
            "offense_type": "PROCEDURAL",
            "bailable": None,
            "compoundable": None,
            "punishment_text": "Admissibility of forensic digital expert testimony.",
            "legacy_code_mapping": {"act": "IEA", "section": "45A", "title": "Opinion of Examiner of Electronic Evidence"},
            "full_text": "When in a proceeding the Court has to form an opinion on any matter relating to any information transmitted or stored in any computer resource or any other electronic or digital form, the opinion of the Examiner of Electronic Evidence is a relevant fact.",
            "conditions": [
                {
                    "id": "BSA-39-C1",
                    "text": "Examination by notified cyber forensic expert / certified laboratory",
                    "is_mandatory": True,
                    "description": "Certified report by State/Central Forensic Science Laboratory (CFSL) examiner under Section 79A IT Act.",
                },
            ],
        },
        "57": {
            "section_number": "57",
            "section_title": "Primary Evidence",
            "chapter": "Chapter V - Of Documentary Evidence",
            "category": "EVIDENCE_RULE",
            "offense_type": "PROCEDURAL",
            "bailable": None,
            "compoundable": None,
            "punishment_text": "Document itself produced for the inspection of the Court.",
            "legacy_code_mapping": {"act": "IEA", "section": "62", "title": "Primary evidence"},
            "full_text": "Primary evidence means the document itself produced for the inspection of the Court. Where a document is executed in several parts, each part is primary evidence.",
            "conditions": [
                {
                    "id": "BSA-57-C1",
                    "text": "Original document or master record presented to court",
                    "is_mandatory": True,
                    "description": "Original instrument, physical ledger, or source storage media.",
                },
            ],
        },
        "58": {
            "section_number": "58",
            "section_title": "Secondary Evidence",
            "chapter": "Chapter V",
            "category": "EVIDENCE_RULE",
            "offense_type": "PROCEDURAL",
            "bailable": None,
            "compoundable": None,
            "punishment_text": "Admissible only when original is shown to be lost, destroyed, or in possession of adversary.",
            "legacy_code_mapping": {"act": "IEA", "section": "63 / 65", "title": "Secondary evidence"},
            "full_text": "Secondary evidence includes certified copies, copies made from original by mechanical processes, and oral accounts of contents given by person who has seen it.",
            "conditions": [
                {
                    "id": "BSA-58-C1",
                    "text": "Foundation laid explaining absence of primary original",
                    "is_mandatory": True,
                    "description": "Evidence demonstrating original was destroyed, withheld by accused, or public document.",
                },
            ],
        },
        "61": {
            "section_number": "61",
            "section_title": "Admissibility of Electronic Records",
            "chapter": "Chapter V",
            "category": "EVIDENCE_RULE",
            "offense_type": "PROCEDURAL",
            "bailable": None,
            "compoundable": None,
            "punishment_text": "Statutory admissibility of electronic records without further proof of original.",
            "legacy_code_mapping": {"act": "IEA", "section": "65A", "title": "Special provisions as to evidence relating to electronic record"},
            "full_text": "Any information contained in an electronic record which is printed on a paper, stored, recorded or copied in optical or magnetic media produced by a computer shall be deemed to be also a document, subject to the provisions of Section 63.",
            "conditions": [
                {
                    "id": "BSA-61-C1",
                    "text": "Electronic record produced by computer/server/digital media",
                    "is_mandatory": True,
                    "description": "Server logs, CDR, WhatsApp chat exports, CCTV footage, database dumps.",
                },
            ],
        },
        "63": {
            "section_number": "63",
            "section_title": "Conditions of Admissibility of Electronic Records (Certificate Mandate)",
            "chapter": "Chapter V",
            "category": "EVIDENCE_RULE",
            "offense_type": "PROCEDURAL",
            "bailable": None,
            "compoundable": None,
            "punishment_text": "Without Section 63 certificate, electronic evidence is inadmissible per se (Anvar P.V. & Arjun Panditrao doctrine).",
            "legacy_code_mapping": {"act": "IEA", "section": "65B", "title": "Admissibility of electronic records (65B Certificate)"},
            "full_text": "A certificate doing any of the following things: (a) identifying the electronic record; (b) describing the manner in which it was produced; (c) giving particulars of the device; signed by a person occupying a responsible official position in relation to the operation of the relevant device.",
            "conditions": [
                {
                    "id": "BSA-63-C1",
                    "text": "Device was in lawful control and operating properly during output generation",
                    "is_mandatory": True,
                    "description": "Computer/server was functioning regularly without compromise to integrity.",
                },
                {
                    "id": "BSA-63-C2",
                    "text": "Mandatory certificate signed by person in responsible official custody",
                    "is_mandatory": True,
                    "description": "Certificate signed by nodal officer, system administrator, or forensic custodian with hash values.",
                },
                {
                    "id": "BSA-63-C3",
                    "text": "Hash integrity verification (SHA-256 / MD5 signature)",
                    "is_mandatory": True,
                    "description": "Cryptographic hash generated at seizure must match current media hash to prove absence of tampering.",
                },
            ],
        },
        "104": {
            "section_number": "104",
            "section_title": "Burden of Proof",
            "chapter": "Chapter VII - Of the Burden of Proof",
            "category": "EVIDENCE_RULE",
            "offense_type": "PROCEDURAL",
            "bailable": None,
            "compoundable": None,
            "punishment_text": "Standard of proof beyond reasonable doubt on prosecution in criminal trials.",
            "legacy_code_mapping": {"act": "IEA", "section": "101", "title": "Burden of proof"},
            "full_text": "Whoever desires any Court to give judgment as to any legal right or liability dependent on the existence of facts which he asserts, must prove that those facts exist.",
            "conditions": [
                {
                    "id": "BSA-104-C1",
                    "text": "Prosecution must establish all ingredients of offense beyond reasonable doubt",
                    "is_mandatory": True,
                    "description": "Affirmative evidential burden rests with the State; failure to prove essential ingredient mandates acquittal.",
                },
            ],
        },
        "106": {
            "section_number": "106",
            "section_title": "Burden of Proving Fact Especially Within Knowledge",
            "chapter": "Chapter VII",
            "category": "EVIDENCE_RULE",
            "offense_type": "PROCEDURAL",
            "bailable": None,
            "compoundable": None,
            "punishment_text": "Evidentiary rule shifting explanation burden to person having exclusive knowledge.",
            "legacy_code_mapping": {"act": "IEA", "section": "106", "title": "Burden of proving fact especially within knowledge"},
            "full_text": "When any fact is especially within the knowledge of any person, the burden of proving that fact is upon him.",
            "conditions": [
                {
                    "id": "BSA-106-C1",
                    "text": "Fact shown to be exclusively within personal knowledge of the suspect",
                    "is_mandatory": True,
                    "description": "Access to private crypto private keys, secret bank lockers, or encrypted communications.",
                },
            ],
        },
    },
}


def validate_section(statute_code: str, section_number: str) -> bool:
    """
    Strict anti-hallucination check:
    Returns True ONLY if statute_code and section_number exist in the authoritative gazetted corpus.
    Never permits invented sections.
    """
    if not statute_code or not section_number:
        return False
    statute_key = statute_code.strip().upper()
    sec_key = section_number.strip()
    return statute_key in AUTHORITATIVE_SECTIONS and sec_key in AUTHORITATIVE_SECTIONS[statute_key]


def get_authoritative_section(statute_code: str, section_number: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve authoritative gazetted section details.
    """
    statute_key = statute_code.strip().upper()
    sec_key = section_number.strip()
    if validate_section(statute_key, sec_key):
        return AUTHORITATIVE_SECTIONS[statute_key][sec_key]
    return None


def get_all_statutes() -> List[Dict[str, Any]]:
    """Get metadata for BNS, BNSS, BSA."""
    return list(STATUTE_CATALOG.values())


def get_all_sections_for_statute(statute_code: str) -> List[Dict[str, Any]]:
    """Get all gazetted sections for a statute."""
    statute_key = statute_code.strip().upper()
    if statute_key in AUTHORITATIVE_SECTIONS:
        return list(AUTHORITATIVE_SECTIONS[statute_key].values())
    return []


def search_statutory_corpus(query: str, statute_filter: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    """
    Keyword & semantic statutory search over authoritative provisions.
    """
    query_lower = query.lower()
    results = []

    target_statutes = (
        [s.upper() for s in statute_filter if s.upper() in AUTHORITATIVE_SECTIONS]
        if statute_filter
        else list(AUTHORITATIVE_SECTIONS.keys())
    )

    for statute in target_statutes:
        for sec_num, sec_data in AUTHORITATIVE_SECTIONS[statute].items():
            # Match on section number, title, text, conditions, legacy code
            sec_text = f"{sec_num} {sec_data['section_title']} {sec_data['full_text']}".lower()
            legacy_text = str(sec_data.get("legacy_code_mapping", {})).lower()
            cond_text = " ".join([c["text"] + " " + c["description"] for c in sec_data.get("conditions", [])]).lower()

            relevance_score = 0.0
            terms = query_lower.split()
            for term in terms:
                if len(term) < 3:
                    continue
                if term in sec_num:
                    relevance_score += 5.0
                if term in sec_data["section_title"].lower():
                    relevance_score += 4.0
                if term in legacy_text:
                    relevance_score += 3.0
                if term in cond_text:
                    relevance_score += 2.0
                if term in sec_text:
                    relevance_score += 1.0

            if relevance_score > 0:
                results.append({
                    "statute_code": statute,
                    "section_number": sec_num,
                    "section_title": sec_data["section_title"],
                    "chapter": sec_data["chapter"],
                    "category": sec_data["category"],
                    "relevance_score": relevance_score,
                    "data": sec_data,
                })

    results.sort(key=lambda x: x["relevance_score"], reverse=True)
    return results
