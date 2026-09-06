import os

from dotenv import load_dotenv
from neo4j import GraphDatabase

load_dotenv()


class Neo4jService:

    def __init__(self):
        uri = os.getenv("NEO4J_URI")
        username = os.getenv("NEO4J_USERNAME")
        password = os.getenv("NEO4J_PASSWORD")

        if not uri or not username or not password:
            raise ValueError(
                "Neo4j environment variables are missing"
            )

        self.driver = GraphDatabase.driver(
            uri,
            auth=(username, password)
        )

    def verify_connection(self):
        with self.driver.session() as session:
            result = session.run(
                "RETURN 'Neo4j connected' AS message"
            )
            return result.single()["message"]

    def close(self):
        self.driver.close()

    def clear_case(self, case_id):
        query = """
        MATCH (n {case_id: $case_id})
        DETACH DELETE n
        """

        with self.driver.session() as session:
            session.run(
                query,
                case_id=str(case_id)
            )

    def create_entity(
        self,
        case_id,
        entity_id,
        name,
        entity_type,
        confidence=None
    ):
        query = """
        MERGE (n:Entity {
            id: $id,
            case_id: $case_id
        })
        SET
            n.name = $name,
            n.type = $type,
            n.confidence = $confidence
        """

        with self.driver.session() as session:
            session.run(
                query,
                id=str(entity_id),
                case_id=str(case_id),
                name=name,
                type=entity_type,
                confidence=confidence
            )

    def create_relationship(
        self,
        case_id,
        source_id,
        target_id,
        relationship_type,
        confidence=None,
        evidence=None
    ):
        safe_type = (
            relationship_type
            .upper()
            .replace(" ", "_")
            .replace("-", "_")
        )

        query = f"""
        MATCH (a:Entity {{
            id: $source_id,
            case_id: $case_id
        }})

        MATCH (b:Entity {{
            id: $target_id,
            case_id: $case_id
        }})

        MERGE (a)-[r:{safe_type}]->(b)

        SET
            r.confidence = $confidence,
            r.evidence = $evidence
        """

        with self.driver.session() as session:
            session.run(
                query,
                case_id=str(case_id),
                source_id=str(source_id),
                target_id=str(target_id),
                confidence=confidence,
                evidence=evidence
            )

    def get_graph(self, case_id):
        query = """
        MATCH (a:Entity {case_id: $case_id})
        OPTIONAL MATCH (a)-[r]->(b:Entity {case_id: $case_id})

        RETURN a, r, b
        """

        nodes = {}
        edges = []

        with self.driver.session() as session:
            result = session.run(
                query,
                case_id=str(case_id)
            )

            for record in result:
                a = record["a"]
                r = record["r"]
                b = record["b"]

                nodes[a["id"]] = {
                    "id": a["id"],
                    "label": a["name"],
                    "type": a["type"],
                    "confidence": a.get("confidence")
                }

                if r and b:
                    nodes[b["id"]] = {
                        "id": b["id"],
                        "label": b["name"],
                        "type": b["type"],
                        "confidence": b.get("confidence")
                    }

                    edges.append({
                        "source": a["id"],
                        "target": b["id"],
                        "type": r.type,
                        "confidence": r.get("confidence"),
                        "evidence": r.get("evidence")
                    })

        return {
            "nodes": list(nodes.values()),
            "edges": edges
        }
    