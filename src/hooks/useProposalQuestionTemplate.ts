import { useEffect, useState } from "react";
import { useDataAPI } from "./useDataAPI";
import { ProposalTemplate, ProposalTemplateField } from "../model/ProposalModel";

export function useGetProposalQuestionary(proposalId:number) {
  const sendRequest = useDataAPI();
  const [proposalTemplate, setProposalQuestionModel] = useState<ProposalTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getProposalTemplateRequest = () => {
      const query = `
            query {
              proposalTemplate {
                error
                template {
                  topics {
                    topic_title
                    topic_id,
                    fields {
                      proposal_question_id
                      data_type
                      question
                      config
                      dependencies {
                        proposal_question_dependency
                        condition
                        proposal_question_id
                      }
                    }
                  }
                }
              }
            }`;

      sendRequest(query).then(data => {
        setLoading(false);
        setProposalQuestionModel(
          new ProposalTemplate(data.proposalTemplate.template)
        );
      });
    };
    getProposalTemplateRequest();
  }, [sendRequest]); // passing empty array as a second param so that effect is called only once on mount

  return { loading, proposalTemplate };
}

export function useSaveProposalQuestionary() {
  const sendRequest = useDataAPI();
  const [proposalTemplate, setProposalQuestionModel] = useState<ProposalTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saveProposalTemplateRequest = (template:ProposalTemplate) => {
      const query = `
            query {
              proposalTemplate {
                error
                template {
                  topics {
                    topic_title
                    topic_id,
                    fields {
                      proposal_question_id
                      data_type
                      question
                      config
                      dependencies {
                        proposal_question_dependency
                        condition
                        proposal_question_id
                      }
                    }
                  }
                }
              }
            }`;

      sendRequest(query).then(data => {
        setLoading(false);
        setProposalQuestionModel(
          new ProposalTemplate(data.proposalTemplate.template)
        );
      });
    };
    getProposalTemplateRequest();
  }, [sendRequest]); // passing empty array as a second param so that effect is called only once on mount

  return { loading, proposalTemplate };
}
