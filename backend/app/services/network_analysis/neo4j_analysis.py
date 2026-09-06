from app.services.neo4j_service import Neo4jService


class Neo4jAnalysis:

    def __init__(self):
        self.neo4j = Neo4jService()

    def close(self):
        self.neo4j.close()

    # -----------------------------------------
    # DEGREE CENTRALITY
    # -----------------------------------------

    def degree_centrality(self, case_id):

        query = """
        MATCH (n:Entity {case_id: $case_id})
        OPTIONAL MATCH (n)--(connected:Entity {case_id: $case_id})

        WITH n, count(DISTINCT connected) AS connections

        RETURN
            n.id AS id,
            n.name AS entity,
            n.type AS type,
            connections

        ORDER BY connections DESC
        LIMIT 20
        """

        with self.neo4j.driver.session() as session:

            result = session.run(
                query,
                case_id=str(case_id)
            )

            return [
                {
                    "id": record["id"],
                    "entity": record["entity"],
                    "type": record["type"],
                    "connections": record["connections"]
                }
                for record in result
            ]

    # -----------------------------------------
    # BRIDGE ENTITIES
    # -----------------------------------------

    def bridge_entities(self, case_id):

        query = """
        MATCH (n:Entity {case_id: $case_id})
        OPTIONAL MATCH path =
            shortestPath(
                (n)-[*..6]-(other:Entity {case_id: $case_id})
            )

        WITH n, count(path) AS path_count

        RETURN
            n.id AS id,
            n.name AS entity,
            n.type AS type,
            path_count

        ORDER BY path_count DESC
        LIMIT 20
        """

        with self.neo4j.driver.session() as session:

            result = session.run(
                query,
                case_id=str(case_id)
            )

            return [
                {
                    "id": record["id"],
                    "entity": record["entity"],
                    "type": record["type"],
                    "path_count": record["path_count"]
                }
                for record in result
            ]

    # -----------------------------------------
    # COMMUNITY CONNECTIONS
    # -----------------------------------------

    def communities(self, case_id):

        query = """
        MATCH (n:Entity {case_id: $case_id})

        OPTIONAL MATCH (n)-[r]-(m:Entity {case_id: $case_id})

        RETURN
            n.id AS id,
            n.name AS entity,
            n.type AS type,
            collect(DISTINCT m.id) AS connected_entities
        """

        with self.neo4j.driver.session() as session:

            result = session.run(
                query,
                case_id=str(case_id)
            )

            return [
                {
                    "id": record["id"],
                    "entity": record["entity"],
                    "type": record["type"],
                    "connected_entities": record[
                        "connected_entities"
                    ]
                }
                for record in result
            ]

    # -----------------------------------------
    # SHORTEST PATH
    # -----------------------------------------

    def shortest_path(
        self,
        case_id,
        source_id,
        target_id
    ):

        query = """
        MATCH (a:Entity {
            id: $source_id,
            case_id: $case_id
        })

        MATCH (b:Entity {
            id: $target_id,
            case_id: $case_id
        })

        MATCH path =
            shortestPath((a)-[*..10]-(b))

        RETURN
            [node IN nodes(path) |
                {
                    id: node.id,
                    name: node.name,
                    type: node.type
                }
            ] AS nodes,

            [rel IN relationships(path) |
                {
                    type: type(rel)
                }
            ] AS relationships
        """

        with self.neo4j.driver.session() as session:

            result = session.run(
                query,
                case_id=str(case_id),
                source_id=str(source_id),
                target_id=str(target_id)
            )

            record = result.single()

            if not record:
                return None

            return {
                "nodes": record["nodes"],
                "relationships": record["relationships"]
            }